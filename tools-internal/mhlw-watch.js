#!/usr/bin/env node
/**
 * mhlw-watch.js ─ 厚労省チェック係（下ごしらえ）
 *
 * mhlw-watch.json のページを取りに行き、本文の行（会議の回・資料・お知らせ）を前回の控えと比べて、
 * 新しく増えた行だけを出す。関係のある語（keywords）を含む行には ★ を付ける。
 * リンクの文字が「資料」「開催案内」だけの行は、リンク先の題名を足してから判定する（GENERIC）。
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

const clean = s => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

// 審議会のページは各回のリンクの文字が「資料」「開催案内」だけで、回の名前も議題も行に出ない
// （2026-10-19 に介護給付費分科会の居宅療養管理指導の回を、これで見落とした）。
// こういうリンクはリンク先の題名を読み、行の文に足してから ★ を判定する。
const GENERIC = /^(資料|会議資料|開催案内|議事次第|議事録|議事要旨|概要|配布資料)$/;
async function linkTitle(href) {
  try {
    const res = await fetch(href, { headers: { 'User-Agent': 'Mozilla/5.0 (shared-pages mhlw-watch)' } });
    if (!res.ok) return '';
    const html = await res.text();
    const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]*)/i);
    return m ? clean(m[1]).slice(0, 100) : '';
  } catch { return ''; }
}

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

/**
 * 中身まで控えるページ（mhlw-watch.json の contentWatch）。
 * 制度ページは「更新日」だけ変わって新しい題名が出ないことがあり、行の新着だけでは何が変わったか
 * 分からなかった（2026-11-06 の OTC類似薬のページ）。そこで次の3つを控えて前回と比べる。
 *   ① 本文の各行（リンクは「文字 ⟨URL⟩」の形で行に残す）… 増えた行・消えた行を出す
 *   ② リンク先のファイルの大きさ（HEAD の content-length）… 同じURLのまま差し替えられたかの目安
 *   ③ keepExt の拡張子（Excel など小さいもの）は丸ごと保存し、ハッシュで比べる。
 *      変わったら古い版を残すので、/厚労省チェック で read-doc を使って中身を比べられる
 * 控えは private/厚労省チェック/本文控え/<name>/ に置く（page.txt・files.json・files/）。
 */
async function watchContent(c) {
  const crypto = require('crypto');
  const dir = path.join(DIR, '本文控え', c.name);
  const UA = { headers: { 'User-Agent': 'Mozilla/5.0 (shared-pages mhlw-watch)' } };
  let html;
  try {
    const res = await fetch(c.url, UA);
    if (!res.ok) { console.log(`\n■ 中身の控え：${c.name}  × 取得できない（${res.status}）`); return; }
    html = await res.text();
  } catch (e) { console.log(`\n■ 中身の控え：${c.name}  × 取得できない（${e.message}）`); return; }

  // ① 本文の行
  const start = html.indexOf('id="content"');
  const endM = html.slice(start).search(/id="footer"|class="l-footer"|<footer/);
  const body = html.slice(start, endM > 0 ? start + endM : html.length)
    .replace(/<a[^>]+href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/g, (_, h, l) => ` ${l} ⟨${new URL(h, c.url).href}⟩ `);
  const lines = body.replace(/^id="content"[^>]*>/, '').replace(/<!--|-->/g, ' ').split(/<\/tr>|<\/li>|<\/p>|<\/dd>|<\/dt>|<\/h\d>|<br\s*\/?>/i).map(clean).filter(s => s.length >= 2);
  const updated = ((lines.find(s => /更新日/.test(s)) || '').match(/更新日：\S+/) || [''])[0];

  // ②③ リンク先のファイル
  const fileUrls = [...new Set(lines.flatMap(s => [...s.matchAll(/⟨([^⟩]+\.(pdf|xlsx?|docx?|zip|csv))⟩/gi)].map(m => m[1])))];
  const keep = new RegExp(`\\.(${(c.keepExt || ['xlsx']).join('|')})$`, 'i');
  const files = {};
  for (const u of fileUrls) {
    try {
      if (keep.test(u)) {
        const buf = Buffer.from(await (await fetch(u, UA)).arrayBuffer());
        files[u] = { size: buf.length, sha: crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16), buf };
      } else {
        const res = await fetch(u, { ...UA, method: 'HEAD' });
        files[u] = { size: +res.headers.get('content-length') || 0 };
      }
    } catch { files[u] = { size: 0, err: true }; }
  }

  const pageTxt = path.join(dir, 'page.txt'), filesJson = path.join(dir, 'files.json');
  const firstTime = !fs.existsSync(pageTxt);
  const prevLines = firstTime ? [] : fs.readFileSync(pageTxt, 'utf8').split('\n').slice(1);
  const prevFiles = firstTime ? {} : JSON.parse(fs.readFileSync(filesJson, 'utf8'));

  const out = [];
  if (!firstTime) {
    const ps = new Set(prevLines), ns = new Set(lines);
    for (const s of lines) if (!ps.has(s)) out.push(`  ＋ ${s.slice(0, 200)}`);
    for (const s of prevLines) if (!ns.has(s)) out.push(`  － ${s.slice(0, 200)}`);
    for (const [u, f] of Object.entries(files)) {
      const p = prevFiles[u];
      if (!p || f.err || p.err) continue;
      if (f.sha && p.sha && f.sha !== p.sha) out.push(`  ◆ 中身が変わった：${u}（${p.size}→${f.size} バイト。古い版は 本文控え/${c.name}/files/ に残してある）`);
      else if (!f.sha && p.size && f.size && p.size !== f.size) out.push(`  ◆ 大きさが変わった：${u}（${p.size}→${f.size} バイト）`);
    }
  }
  if (firstTime) console.log(`\n■ 中身の控え：${c.name}  初回なので今の状態を記録した（本文 ${lines.length} 行・ファイル ${fileUrls.length} 件）`);
  else if (out.length) console.log(`\n■ 中身の控え：${c.name}（変わった所 ${out.length}）${updated ? '　' + updated : ''}\n  ${c.url}\n${out.join('\n')}`);
  else console.log(`\n・中身の控え：${c.name} … 変化なし${updated ? '（' + updated + '）' : ''}`);

  if (DRY) return;
  fs.mkdirSync(path.join(dir, 'files'), { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  for (const [u, f] of Object.entries(files)) {
    if (!f.buf) continue;
    const name = path.basename(new URL(u).pathname);
    const p = prevFiles[u];
    const cur = path.join(dir, 'files', name);
    if (p && p.sha && p.sha !== f.sha && fs.existsSync(cur)) fs.renameSync(cur, path.join(dir, 'files', name.replace(/(\.\w+)$/, `_${stamp}より前$1`)));
    fs.writeFileSync(cur, f.buf);
    delete f.buf;
  }
  fs.writeFileSync(pageTxt, [`# ${c.name} ${c.url} （控えた日 ${stamp}）`, ...lines].join('\n'));
  fs.writeFileSync(filesJson, JSON.stringify(files, null, 1));
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
    for (const r of fresh) {
      const g = r.links.find(l => !seen.has(l.href) && GENERIC.test(l.label) && /\.html?$/.test(l.href));
      if (!g) continue;
      const t = await linkTitle(g.href);
      if (t) r.text = `${t} ｜ ${r.text}`.slice(0, 200);
    }
    const shown = fresh.filter(r => ALL || KW.test(r.text));
    total += fresh.length; star += shown.length;
    if (!fresh.length) continue;
    console.log(`\n■ ${p.name}（新しい行 ${fresh.length}・うち関係あり ${fresh.filter(r => KW.test(r.text)).length}）\n  ${p.url}`);
    for (const r of shown) {
      console.log(`  ${KW.test(r.text) ? '★' : '・'} ${r.text}`);
      for (const l of r.links.filter(l => !seen.has(l.href)).slice(0, 4)) console.log(`      ${l.label.slice(0, 30)}  ${l.href}`);
    }
  }

  // 中身まで控えるページ（contentWatch）：本文の行とリンク先のファイルを控え、変わった所を出す
  for (const c of CONF.contentWatch || []) await watchContent(c);

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
