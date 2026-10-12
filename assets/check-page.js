#!/usr/bin/env node
/**
 * check-page.js
 *
 * /デザイン点検 と CLAUDE.md の「個別ページの必須要素」のうち、機械で判定できるものを洗い出す。
 * 直しはしない。人が目で見るのは「色の付け方が適切か」「内容が混ざっていないか」だけにするための係。
 * 文字色の薄さは check-contrast.js、言葉遣いは check-wording.js が見る（ここでは見ない）。
 *
 * 使い方：
 *   node assets/check-page.js                       … 公開ページ全部
 *   node assets/check-page.js 加算まとめ/吸入薬指導加算.html
 *   node assets/check-page.js --ng                  … 「要修正」だけ
 *
 * ・要修正 … ルール違反がはっきりしているもの（公開前に0件にする）
 * ・確認   … ページの性質しだいで正しいこともあるもの（印刷1枚もの・原文ページなど）
 *
 * 項目を足すときは CHECKS に1つ足す。誤検出が出るなら skip にファイルを足して絞る。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const NG_ONLY = process.argv.includes('--ng');
// build-page-meta.js / build-search-index.js の PUBLIC_DIRS と揃える
const PUBLIC_DIRS = ['yakureki', '加算まとめ', '改定資料', 'チェックリスト', 'ツール', 'ナレッジ', '事務'];
const HUBS = ['index.html', 'updates.html', '加算まとめ.html', 'checklists.html', 'kaitei2026.html',
  'tools.html', 'knowledge.html', '事務スタッフ向け.html', 'ページ一覧.html', 'yakureki/index.html', '404.html'];

const HEADER_JS = fs.readFileSync(path.join(ROOT, 'assets/site-header.js'), 'utf8');

function targets() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  if (args.length) return args.map(a => path.relative(ROOT, path.resolve(a)).replace(/\\/g, '/'));
  const list = [];
  for (const dir of PUBLIC_DIRS) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs)) if (f.endsWith('.html')) list.push(dir + '/' + f);
  }
  return list;
}

/** <style> の中身だけ（コメント除去） */
function styles(html) {
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}
/** HTMLコメント・style・script を除いた本文側 */
function body(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '').replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');
}

const CHECKS = [
  {
    level: 'ng', name: '原色の赤を使っている',
    test: (c) => {
      const used = c.css.split('\n').filter(l => /var\(--red\)|#cc0000|#c00\b|#ff0000|#f00\b|:\s*red\b/i.test(l) && !/--red\s*:/.test(l));
      const inline = (c.html.match(/style="[^"]*(#cc0000|#c00\b|#ff0000|var\(--red\))/gi) || []);
      return [...used, ...inline].map(s => s.trim().slice(0, 70));
    },
  },
  {
    level: 'ng', name: '旧ルールの変数・背景色が残っている',
    test: (c) => [...new Set(c.css.match(/--blue-light|--sub\s*:|--bg\s*:\s*#(f5f7fa|f2f4f8)/gi) || [])],
  },
  {
    level: 'ng', name: '共通ヘッダー（site-header.js）を読んでいない',
    test: (c) => /site-header\.js/.test(c.html) ? [] : ['<body> 直後に site-header.js がない'],
  },
  {
    level: 'ng', name: '手動の「戻る」ボタンがある（共通ヘッダーと二重になる）',
    test: (c) => (body(c.html).match(/[←＜<]\s*(トップ|一覧|ホーム)に戻る|back-link/g) || []),
  },
  {
    level: 'ng', name: 'site-header.js の PAGES に登録されていない（検索・パンくずに出ない）',
    skip: (c) => c.isHub || c.isDraft,
    test: (c) => HEADER_JS.includes(`'${c.rel}'`) ? [] : [`'${c.rel}' が PAGES にない`],
  },
  {
    level: 'ng', name: 'リンク先のファイルがない',
    skip: (c) => c.isDraft,   // draft/ は昇格後の置き場所を前提にリンクを書く慣習なので見ない
    test: (c) => {
      const out = [];
      for (const m of body(c.html).matchAll(/\b(?:href|src)="([^"#?]+)(?:[#?][^"]*)?"/g)) {
        const u = m[1];
        if (/^(https?:|mailto:|tel:|data:|javascript:|\/\/)/.test(u) || !u) continue;
        let p;
        try { p = decodeURIComponent(u); } catch { p = u; }
        const abs = path.resolve(path.dirname(path.join(ROOT, c.rel)), p);
        if (!fs.existsSync(abs)) out.push(u);
      }
      return [...new Set(out)];
    },
  },
  {
    level: 'ng', name: '.table-wrap を使っているのに overflow-x の定義がない（スマホで横に流れる）',
    test: (c) => /class="(?:[^"]*\s)?table-wrap[\s"]/.test(c.html) && !/\.table-wrap[^{]*\{[^}]*overflow-x/.test(c.css)
      && !/table-wrap/.test(c.linkedCss) ? ['.table-wrap { overflow-x:auto; } を足す'] : [],
  },
  {
    level: 'ng', name: '折りたたみの題名に記号や「開閉」の説明を書いている（fold.css が付ける）',
    test: (c) => [...c.html.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/gi)]
      .map(m => m[1].replace(/<[^>]+>/g, '').trim())
      .filter(t => /^[▶▸►›>＞▼]|（折りたたみ）|タップで(開閉|開く)/.test(t)),
  },
  {
    level: 'ng', name: '部品のCSSを読んでいない',
    test: (c) => {
      const out = [];
      if (/<!-- gigi-list:|<!-- qa-list:/.test(c.html) && !/gigi-list\.css/.test(c.html)) out.push('gigi-list.css');
      if (/class="ref-links"|<!-- genbun /.test(c.html) && !/source-refs\.css/.test(c.html)) out.push('source-refs.css');
      return out;
    },
  },
  {
    level: 'ng', name: '原文参照バーをインラインstyleで書いている',
    test: (c) => (c.html.match(/class="ref-links"[^>]*style=|style="[^"]*"[^>]*class="ref-links"/g) || []),
  },
  {
    level: 'check', name: 'GoatCounter のタグがない',
    skip: (c) => c.isDraft,
    test: (c) => /goatcounter/.test(c.html) ? [] : ['</body> 直前に GoatCounter'],
  },
  {
    level: 'check', name: 'スマホ幅（max-width:640px）の指定がない',
    test: (c) => /max-width\s*:\s*6[0-9]{2}px/.test(c.css + c.linkedCss) ? []: ['@media (max-width:640px)'],
  },
  {
    level: 'check', name: '印刷用（@media print）の指定がない',
    test: (c) => /@media\s+print/.test(c.css + c.linkedCss) ? []: ['@media print'],
  },
  {
    level: 'check', name: '背景色がサイトの基準（#f3f4f6）と違う',
    test: (c) => {
      const m = c.css.match(/--bg\s*:\s*(#[0-9a-f]{3,6})/i);
      return m && m[1].toLowerCase() !== '#f3f4f6' ? [`--bg:${m[1]}`] : [];
    },
  },
  {
    level: 'check', name: 'search-keywords がない（現場語で検索に当たらない）',
    skip: (c) => c.isHub,
    test: (c) => /name="search-keywords"/.test(c.html) ? [] : ['<meta name="search-keywords" content="…">'],
  },
  {
    level: 'check', name: '折りたたみがあるのに fold.css を読んでいない（一瞬古い見た目になる）',
    test: (c) => /class="fold(-in)?"/.test(c.html) && !/fold\.css/.test(c.html) ? ['fold.css'] : [],
  },
  {
    level: 'check', name: '入力欄の案内文が薄い（#6b7280 にする）',
    test: (c) => (c.css.match(/::?placeholder[^{]*\{[^}]*color\s*:\s*#(a{3}|b{3}|9{3}|a{6}|b{6}|9{6}|ccc)\b[^}]*\}/gi) || [])
      .map(s => s.replace(/\s+/g, ' ').slice(0, 70)),
  },
];

let ngTotal = 0, checkTotal = 0;
const files = targets();
for (const rel of files) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { console.log('× ファイルがない: ' + rel); continue; }
  const html = fs.readFileSync(abs, 'utf8');
  const linkedCss = [...html.matchAll(/<link[^>]+href="([^"]+\.css)"/g)]
    .map(m => { try { return fs.readFileSync(path.resolve(path.dirname(abs), m[1]), 'utf8'); } catch { return ''; } }).join('\n');
  const c = { rel, html, css: styles(html), linkedCss, isHub: HUBS.includes(rel), isDraft: rel.startsWith('draft/') };
  const lines = [];
  for (const k of CHECKS) {
    if (NG_ONLY && k.level !== 'ng') continue;
    if (k.skip && k.skip(c)) continue;
    const hits = k.test(c);
    if (!hits.length) continue;
    if (k.level === 'ng') ngTotal++; else checkTotal++;
    lines.push(`  ${k.level === 'ng' ? '要修正' : '確認  '} ${k.name}`);
    for (const h of hits.slice(0, 5)) lines.push(`         ${h}`);
    if (hits.length > 5) lines.push(`         ほか${hits.length - 5}件`);
  }
  if (lines.length) console.log(`\n■ ${rel}\n${lines.join('\n')}`);
}

console.log(`\n要修正 ${ngTotal}件 / 確認 ${checkTotal}件（${files.length}ページ）`);
if (!ngTotal && !checkTotal) console.log('機械で判定できる項目に違反は見つからなかった。');
process.exit(0);
