#!/usr/bin/env node
/**
 * mhlw-watch.js ─ 厚労省チェック係（下ごしらえ）
 *
 * mhlw-watch.json のページを取りに行き、本文の行（会議の回・資料・お知らせ）を前回の控えと比べて、
 * 新しく増えた行だけを出す。関係のある語（keywords）を含む行には ★ を付ける。
 * Claude を使わずに動くので、何度回しても使用量はかからない。中身を読んで要約するのは
 * /厚労省チェック（または定期実行）で Claude がこの出力を受け取ってから行う。
 *
 *   node tools-internal/mhlw-watch.js          新しい行を出し、控えを更新する
 *   node tools-internal/mhlw-watch.js --dry    控えを更新しない（試し見）
 *   node tools-internal/mhlw-watch.js --all    ★ の付かない行も全部出す
 *
 * 控えは private/厚労省チェック/snapshot.json（初回はここに今の状態を記録するだけで、新着は出ない）。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONF = JSON.parse(fs.readFileSync(path.join(__dirname, 'mhlw-watch.json'), 'utf8'));
const DIR = path.join(ROOT, 'private', '厚労省チェック');
const SNAP = path.join(DIR, 'snapshot.json');
const DRY = process.argv.includes('--dry');
const ALL = process.argv.includes('--all');
const KW = new RegExp(CONF.keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));

const clean = s => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/** 本文（#content〜フッター）の行ごとに、行の文とその行のリンクを返す */
function rows(html, base) {
  const start = html.indexOf('id="content"');
  const endM = html.slice(start).search(/id="footer"|class="l-footer"|<footer/);
  const body = html.slice(start, endM > 0 ? start + endM : html.length);
  const out = [];
  for (const chunk of body.split(/<\/tr>|<\/li>|<\/p>|<\/dd>|<br\s*\/?>/i)) {
    const links = [...chunk.matchAll(/<a[^>]+href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/g)]
      .map(m => ({ href: new URL(m[1], base).href, label: clean(m[2]) }))
      .filter(l => l.label && !/\/(index\.html)?$/.test(l.href) && !/get\.adobe|#/.test(l.href));
    if (!links.length) continue;
    const text = clean(chunk);
    if (text.length < 2) continue;
    out.push({ text: text.slice(0, 160), links });
  }
  return out;
}

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  const prev = fs.existsSync(SNAP) ? JSON.parse(fs.readFileSync(SNAP, 'utf8')) : {};
  const next = {};
  const first = !Object.keys(prev).length;
  let total = 0, star = 0;

  for (const p of CONF.pages) {
    let html;
    try {
      const res = await fetch(p.url, { headers: { 'User-Agent': 'Mozilla/5.0 (shared-pages mhlw-watch)' } });
      if (!res.ok) { console.log(`\n■ ${p.name}  × 取得できない（${res.status}）\n  ${p.url}`); next[p.url] = prev[p.url] || []; continue; }
      html = await res.text();
    } catch (e) { console.log(`\n■ ${p.name}  × 取得できない（${e.message}）`); next[p.url] = prev[p.url] || []; continue; }

    const rs = rows(html, p.url);
    const seen = new Set(prev[p.url] || []);
    next[p.url] = [...new Set(rs.flatMap(r => r.links.map(l => l.href)))];
    if (first || !prev[p.url]) continue;

    const fresh = rs.filter(r => r.links.some(l => !seen.has(l.href)));
    const shown = fresh.filter(r => ALL || KW.test(r.text));
    total += fresh.length; star += shown.length;
    if (!fresh.length) continue;
    console.log(`\n■ ${p.name}（新しい行 ${fresh.length}・うち関係あり ${fresh.filter(r => KW.test(r.text)).length}）\n  ${p.url}`);
    for (const r of shown) {
      console.log(`  ${KW.test(r.text) ? '★' : '・'} ${r.text}`);
      for (const l of r.links.filter(l => !seen.has(l.href)).slice(0, 4)) console.log(`      ${l.label.slice(0, 30)}  ${l.href}`);
    }
  }

  // 復旧待ちのページ（落ちているサイトが戻ったか）
  for (const w of CONF.waitFor || []) {
    let state;
    try {
      const res = await fetch(w.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'manual' });
      const title = res.status === 200 ? ((await res.text()).match(/<title>([^<]*)/) || [])[1] || '' : '';
      state = res.status === 200 && !title.includes(w.downTitle) ? 'up' : `まだ（${res.status}${title ? '・' + title.trim() : ''}）`;
    } catch (e) { state = `まだ（${e.message}）`; }
    console.log(state === 'up' ? `\n★ 復旧した：${w.name}\n  ${w.url}` : `\n・復旧待ち：${w.name} … ${state}`);
  }

  if (!DRY) fs.writeFileSync(SNAP, JSON.stringify(next, null, 1));
  if (first) console.log(`初回なので今の状態を控えに記録した（${CONF.pages.length}ページ）。次回から新しい行だけを出す。`);
  else console.log(`\n新しい行 ${total} / うち関係あり ${star}${DRY ? '（--dry：控えは更新していない）' : ''}`);
})();
