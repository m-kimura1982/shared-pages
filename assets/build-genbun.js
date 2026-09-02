#!/usr/bin/env node
/**
 * build-genbun.js ─ 各ページの「原文を見る（告示・通知）」を正本から自動生成する
 *
 * 正本は 改定資料/ の3枚だけ。加算ページには原文を書き写さず、下のマーカーを置いて
 * このスクリプトを流す。マーカーの間は毎回まるごと上書きされる。
 *
 *   <!-- genbun betten3="kub-10-3-12" hyo3="ku10-3" note="13,16" kijun="sec-95" -->
 *   <!-- /genbun -->
 *
 *   betten3 … 別添3 の項目 id（通知）        複数可（カンマ区切り）
 *   hyo3    … 別表第三 の区分 id（告示）
 *   note    … hyo3 の中から載せる注番号      例 note="4,5,15,16"／note="all"
 *   kijun   … 特掲診療料 施設基準の id       複数可
 *   summary … 折りたたみの見出し（省略時は中身から自動）
 *
 *   node assets/build-genbun.js          生成して書き込む
 *   node assets/build-genbun.js --check  差分の確認のみ（書き込まない）
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIRS = ['', '加算まとめ', 'チェックリスト', '改定資料', 'ツール', 'ナレッジ', '事務', 'yakureki'];

const SRC = {
  betten3: { file: '改定資料/別添3_調剤報酬点数表に関する事項2026.html', name: '別添3' },
  hyo3: { file: '改定資料/別表第三_調剤報酬点数表2026.html', name: '別表第三' },
  kijun: { file: '改定資料/特掲診療料_施設基準届出_調剤関係2026.html', name: '特掲診療料 施設基準' },
};
for (const k of Object.keys(SRC)) SRC[k].html = fs.readFileSync(path.join(ROOT, SRC[k].file), 'utf8');

const CITE_BETTEN3 = '「診療報酬の算定方法の一部改正に伴う実施上の留意事項について」（令和8年3月5日　保医発0305第6号）別添3';
const CITE_HYO3 = '診療報酬の算定方法（別表第三　調剤報酬点数表）';
const CITE_KIJUN = '「特掲診療料の施設基準等及びその届出に関する手続きの取扱いについて」別添1';

/* ── 共通ユーティリティ ───────────────────────────── */

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// タグを落として本文だけにする（実体参照はそのまま残す）
function plain(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/[\t\n\r ]+/g, ' ')     // 全角スペース（U+3000）は原文の区切りなので残す
    .replace(/^[\s　]+|[\s　]+$/g, '');
}

// id="X" の要素から、次の見出し（card / section-header / item-heading）の手前までを切り出す。
// 原文ページは入れ子が深く閉じタグの対応取りが当てにならないので、区切りで拾う。
function elementAt(html, id) {
  const at = html.indexOf(`id="${id}"`);
  if (at < 0) return null;
  const start = html.lastIndexOf('<', at);
  const openTagEnd = html.indexOf('>', at);
  const openTag = html.slice(start, openTagEnd + 1);
  const isHeading = /class="[^"]*item-heading/.test(openTag);
  const isCard = /class="[^"]*\bcard\b/.test(openTag);
  // カードを指した時は次のカードまで、項目見出しを指した時は次の見出しまで
  const cls = names => new RegExp(`<div[^>]*class="(?:[^"]*[\\t\\n\\r ])?(?:${names})(?:[\\t\\n\\r ][^"]*)?"`, 'g');
  const boundary = isCard
    ? cls('card|section-header')
    : cls('card|section-header|item-heading');
  boundary.lastIndex = openTagEnd;
  const m = boundary.exec(html);
  const end = m ? m.index : html.length;
  return { start, end, isHeading };
}

// 「区分１０の３　服薬管理指導料」のような見出しを、その id を含むカードから取る
function kubunOf(html, id) {
  const at = html.indexOf(`id="${id}"`);
  if (at < 0) return '';
  const before = html.slice(0, html.indexOf(">", at) + 1);
  let cardAt = -1;
  for (const m of before.matchAll(/<div[^>]*class="card"[^>]*>/g)) cardAt = m.index;
  if (cardAt < 0) return '';
  const scope = html.slice(cardAt, at + 400000);
  const kt = /<div class="kubun-title">([\s\S]*?)<\/div>/.exec(scope);
  if (kt) {
    const num = /<span class="kub-num">([^<]*)<\/span>/.exec(kt[1]);
    const rest = plain(kt[1].replace(/<span class="kub-num">[^<]*<\/span>/, ''));
    return num ? `${num[1].trim()}　${rest}` : plain(kt[1]);
  }
  // 別表第三は card-title に「区分　１０の３　服薬管理指導料」が入る（点数バッジは除く）
  const ct = /<div class="card-title">([\s\S]*?)(?:<div class="score-block">|<\/div>)/.exec(scope);
  if (ct) {
    const sp = /<span>([^<]*)<\/span>/.exec(ct[1]);
    return plain(sp ? sp[1] : ct[1]).replace(/^区分　/, '区分');
  }
  return '';
}

/* ── 別添3・施設基準（reg-* 構造）を .orig の行に変換 ────────── */

function renderRegBlock(section) {
  const rows = [];
  let cur = null;
  const push = () => { if (cur) { rows.push(cur); cur = null; } };

  // reg-item / reg-item-sub / -sub2 / -sub3 と reg-para を出現順に拾う
  const re = /<(p|div) class="(reg-para|reg-item|reg-item-sub|reg-item-sub2|reg-item-sub3)"[^>]*>([\s\S]*?)(?=<(?:p|div) class="(?:reg-para|reg-item|reg-item-sub|reg-item-sub2|reg-item-sub3)"|<\/div>\s*(?:<div class="(?:card|item-heading)")|$)/g;
  let m;
  while ((m = re.exec(section))) {
    const kind = m[2];
    const chunk = m[3];
    if (kind === 'reg-para') {
      push();
      const t = plain(chunk);
      if (t) rows.push({ para: t });
      continue;
    }
    const numM = /<span class="reg-num(?:-sub)?">([\s\S]*?)<\/span>/.exec(chunk);
    const bodyM = /<div class="reg-body">([\s\S]*?)<\/div>/.exec(chunk);
    const num = numM ? plain(numM[1]) : '';
    const body = bodyM ? plain(bodyM[1]) : plain(chunk.replace(/<span class="reg-num(?:-sub)?">[\s\S]*?<\/span>/, ''));
    if (!num && !body) continue;
    if (kind === 'reg-item') {
      push();
      cur = { lab: num, body, subs: [] };
    } else {
      const depth = kind === 'reg-item-sub' ? 1 : kind === 'reg-item-sub2' ? 2 : 3;
      if (!cur) cur = { lab: '', body: '', subs: [] };
      cur.subs.push({ depth, text: (num ? num + '　' : '') + body });
    }
  }
  push();
  return rows;
}

function rowsToHtml(rows, indent) {
  const out = [];
  for (const r of rows) {
    if (r.para) { out.push(`${indent}<div class="opara">${esc(r.para)}</div>`); continue; }
    const subs = r.subs.map(s => `<span class="sub${s.depth > 1 ? ' d' + s.depth : ''}">${esc(s.text)}</span>`).join('');
    out.push(`${indent}<div class="oi"><span class="lab">${esc(r.lab)}</span><span>${esc(r.body)}${subs}</span></div>`);
  }
  return out;
}

/* ── 別表第三（note-item 構造） ─────────────────────── */

function renderNotes(cardId, want) {
  const el = elementAt(SRC.hyo3.html, cardId);
  if (!el) return { rows: [], missing: [want.join(',')] };
  const section = SRC.hyo3.html.slice(el.start, el.end);
  const rows = [], found = new Set();
  // note-item は中に点数表を持つことがあるので、次の note-item / 区切り線までを1件とみなす
  const starts = [...section.matchAll(/<div[^>]*class="note-item"[^>]*>/g)];
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i].index + starts[i][0].length;
    const to = i + 1 < starts.length ? starts[i + 1].index : section.length;
    let chunk = section.slice(from, to).replace(/<hr class="divider">[\s\S]*$/, '');

    const labM = /<span class="note-label">([\s\S]*?)<\/span>/.exec(chunk);
    if (!labM) continue;
    const label = plain(labM[1]);                    // 例「注12（吸入薬指導加算）」「注１」
    const nM = /注[\s　]*([0-9０-９一二三四五六七八九十]+)/.exec(label);
    const n = nM ? toArabic(nM[1]) : null;
    if (want[0] !== 'all' && !want.includes(String(n))) continue;
    found.add(String(n));

    chunk = chunk.slice(labM.index + labM[0].length);
    const tableAt = chunk.search(/<div class="score-table-wrap">|<table/);
    const body = plain(tableAt < 0 ? chunk : chunk.slice(0, tableAt));
    const subs = [];
    if (tableAt >= 0) {
      for (const tr of chunk.slice(tableAt).matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
        const cells = [...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(c => plain(c[1])).filter(Boolean);
        if (!cells.length) continue;
        if (/^(区分|点数)$/.test(cells[0])) continue;   // 見出し行
        subs.push({ depth: 1, text: cells.join('　') });
      }
    }
    rows.push({ lab: label.replace(/（[^）]*）[\s　]*$/, ''), body, subs });
  }
  const missing = want[0] === 'all' ? [] : want.filter(w => !found.has(w));
  return { rows, missing };
}

function toArabic(s) {
  const z = '０１２３４５６７８９';
  s = s.replace(/[０-９]/g, c => String(z.indexOf(c)));
  if (/^\d+$/.test(s)) return Number(s);
  const k = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (s === '十') return 10;
  let m = /^(十)?([一二三四五六七八九])?$/.exec(s);
  if (m && m[1]) return 10 + (m[2] ? k[m[2]] : 0);
  m = /^([一二三四五六七八九])十([一二三四五六七八九])?$/.exec(s);
  if (m) return k[m[1]] * 10 + (m[2] ? k[m[2]] : 0);
  return k[s] ?? null;
}

/* ── 1ブロック分の生成 ─────────────────────────── */

function buildBlock(attrs, warn) {
  const parts = [];
  const cites = [];
  const ind = '        ';

  // 告示（別表第三）
  if (attrs.hyo3) {
    const want = (attrs.note || 'all').split(',').map(s => s.trim()).filter(Boolean);
    const { rows, missing } = renderNotes(attrs.hyo3, want);
    if (missing.length) warn.push(`注${missing.join('・')} が ${attrs.hyo3} に見つからない`);
    if (rows.length) {
      parts.push(`${ind}<div class="oh">告示（別表第三　${esc(kubunOf(SRC.hyo3.html, attrs.hyo3))}）</div>`);
      parts.push(...rowsToHtml(rows, ind));
      cites.push(CITE_HYO3);
    }
  }

  // 通知（別添3）
  for (const id of (attrs.betten3 || '').split(',').map(s => s.trim()).filter(Boolean)) {
    const el = elementAt(SRC.betten3.html, id);
    if (!el) { warn.push(`別添3 に ${id} が見つからない`); continue; }
    const section = SRC.betten3.html.slice(el.start, el.end);
    const headM = /<div[^>]*class="[^"]*item-heading[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(section);
    let head = headM ? plain(headM[1].replace(/<span class="num-badge">([^<]*)<\/span\s*>/, '$1 ')) : '';
    // 見出しではなく reg-para（「１ 通則」など）を指した場合はその文言を見出しに使う
    if (!headM) {
      const paraM = /<p[^>]*class="reg-para"[^>]*>([\s\S]*?)<\/p>/.exec(section);
      if (paraM) head = plain(paraM[1]);
    }
    const rows = renderRegBlock(section);
    if (!rows.length) { warn.push(`別添3 ${id} から本文を取り出せない`); continue; }
    const kubun = kubunOf(SRC.betten3.html, id);
    const label = head ? `${kubun}　${head}` : kubun;
    parts.push(`${ind}<div class="oh">通知（別添3　${esc(label)}）</div>`);
    parts.push(...rowsToHtml(rows, ind));
    if (/<table/.test(section)) warn.push(`別添3 ${id} には表がある（原文ページ側を参照）`);
    cites.push(CITE_BETTEN3);
  }

  // 施設基準
  for (const id of (attrs.kijun || '').split(',').map(s => s.trim()).filter(Boolean)) {
    const el = elementAt(SRC.kijun.html, id);
    if (!el) { warn.push(`施設基準に ${id} が見つからない`); continue; }
    const section = SRC.kijun.html.slice(el.start, el.end);
    const rows = renderRegBlock(section);
    if (!rows.length) { warn.push(`施設基準 ${id} から本文を取り出せない`); continue; }
    parts.push(`${ind}<div class="oh">施設基準（${esc(kubunOf(SRC.kijun.html, id))}）</div>`);
    parts.push(...rowsToHtml(rows, ind));
    cites.push(`${CITE_KIJUN} ${kubunOf(SRC.kijun.html, id).split('　')[0]}`);
  }

  if (!parts.length) return null;

  const uniqCites = [...new Set(cites)];
  parts.push(`${ind}<div class="cite">出典：${esc(uniqCites.join('／'))}。</div>`);

  const summary = attrs.summary || (attrs.kijun ? '原文を見る（告示・通知・施設基準）' : '原文を見る（告示・通知）');
  return [
    `    <details class="fold avoid-break">`,
    `      <summary>${esc(summary)}</summary>`,
    `      <div class="fold-body">`,
    `        <div class="orig">`,
    ...parts,
    `        </div>`,
    `      </div>`,
    `    </details>`,
  ].join('\n');
}

/* ── ページを走査して書き換え ─────────────────────── */

const CHECK = process.argv.includes('--check');
const files = [];
for (const d of PUBLIC_DIRS) {
  for (const f of fs.readdirSync(path.join(ROOT, d))) {
    if (f.endsWith('.html')) files.push(path.posix.join(d, f).replace(/^\//, ''));
  }
}

let changed = 0, blocks = 0;
const warnings = [];

for (const rel of files) {
  const abs = path.join(ROOT, rel);
  let s = fs.readFileSync(abs, 'utf8');
  if (!s.includes('<!-- genbun ')) continue;
  const before = s;

  // 生成ブロックの改行は、そのファイルの改行に合わせる。
  // LF 決め打ちで書くと、CRLF のページでは中身が同じでも毎回「差分あり」と出て、
  // 本物の差分が埋もれる（2026-09-02、調剤管理料で発見）。
  // Windows では git が checkout 時に CRLF へ変換するので、環境によって差が出ていた。
  const EOL = /\r\n/.test(s) ? '\r\n' : '\n';

  s = s.replace(/([ \t]*)<!-- genbun ([^>]*?)-->[\s\S]*?<!-- \/genbun -->/g, (m, ind, attrStr) => {
    const attrs = {};
    for (const a of attrStr.matchAll(/(\w+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    const warn = [];
    const body = buildBlock(attrs, warn);
    blocks++;
    warn.forEach(w => warnings.push(`${rel}: ${w}`));
    if (!body) { warnings.push(`${rel}: 生成できなかった（${attrStr.trim()}）`); return m; }
    return `${ind}<!-- genbun ${attrStr}-->\n${body}\n${ind}<!-- /genbun -->`.replace(/\r?\n/g, EOL);
  });

  if (s !== before) {
    changed++;
    if (!CHECK) fs.writeFileSync(abs, s, 'utf8');
    console.log(`${CHECK ? '差分あり' : '更新'}  ${rel}`);
  }
}

console.log(`\nブロック ${blocks} 件／${CHECK ? '差分' : '更新'} ${changed} ファイル`);
if (warnings.length) {
  console.log('\n【確認】');
  warnings.forEach(w => console.log('  ' + w));
}
