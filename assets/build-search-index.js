/**
 * 各公開ページの見出しを集めて検索用の索引を作る
 *
 * 実行: node assets/build-search-index.js
 *
 * サイト内検索（site-search.js）とページ一覧（ページ一覧.html）は、これまで
 * ページ名だけを見ていた。ページ名に出てこない言葉（「限度額」「マイナ保険証」など）で
 * 探せるように、各ページの見出しを拾って索引にする。
 *
 * 拾うもの：h1 ／ .card-title ／ .sub-title ／ .section-title ／ .tool-name ／ .item-heading
 *           ＋ data-keywords 属性（かな読みなど、手で足した検索語）
 *           ＋ <meta name="search-keywords" content="湿布,貼付剤,…">
 *
 * 見出しに出てこない言葉で探せるようにしたいときは、そのページの <head> に
 *   <meta name="search-keywords" content="湿布,貼付剤,前後7日">
 * を足す（読点・カンマ区切り）。
 *
 * 入口ページ（ハブ）は中身が他ページ名の並びなので索引に入れない。
 * 入れると、どの語で探しても入口ページが並んで邪魔になる。
 *
 * ページを追加・改修したら再実行する（/公開 の中で走る）。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
// build-page-meta.js の PUBLIC_DIRS と揃える
const PUBLIC_DIRS = ['yakureki', '加算まとめ', '改定資料', 'チェックリスト', 'ツール', 'ナレッジ', '事務'];

const CLASS_NAMES = ['card-title', 'sub-title', 'section-title', 'tool-name', 'item-heading'];
const MAX_TERMS = 250;   // 1ページあたりの上限（別添3のような大型ページ対策）
const MAX_LEN = 60;      // 1語の長さ上限

// 入口ページ（ハブ）・トップ・更新履歴・一覧は索引に入れない
const SKIP = new Set([
  'index.html', 'updates.html', 'ページ一覧.html', '404.html',
  'kaitei2026.html', '加算まとめ.html', 'checklists.html', 'tools.html',
  'knowledge.html', '事務スタッフ向け.html', 'yakureki/index.html',
]);

/**
 * 索引に入れない見出し（定型の枠組み・案内文）
 *
 * 多くのページに同じ文字列で出る見出しは、ページを見分ける手がかりにならない。
 * 索引に入れると「疑義解釈」で検索したとき、各ページの「関連する疑義解釈」が
 * 20件以上並んで、本命（疑義解釈まとめ・全文検索ツール）が埋もれる。
 *
 * 残すもの：「レセプト摘要欄記載事項」「薬歴記載事項」など内容を指す見出し。
 * 「摘要欄」「薬歴記載」で該当ページを探す使い方があるので消さない。
 */
const SKIP_TERMS = new Set([
  '関連ページ', '関連する疑義解釈', '関連する過去の疑義解釈', '関連する社内Q&A',
  '原文を見る', '原文を見る（告示・通知）', '原文参照',
  '目次', 'CONTENTS', 'このページの内容',
  '薬剤名から記載例を探す', '加算名から探す',
]);
/** 前方一致で外すもの（見出しに件数やUI文言がくっつくケース） */
const SKIP_TERM_PREFIXES = ['算定前セルフチェック', '関連する疑義解釈', '関連する社内Q&A'];

function isSkipTerm(t) {
  const k = t.replace(/\s+/g, '');
  if (SKIP_TERMS.has(k)) return true;
  return SKIP_TERM_PREFIXES.some((p) => k.startsWith(p));
}

const files = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
for (const dir of PUBLIC_DIRS) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const f of fs.readdirSync(abs)) {
    if (f.endsWith('.html')) files.push(`${dir}/${f}`);
  }
}

/** タグを落として本文だけにする。見出しの補足語（.qual）やバッジは検索語に含めない */
function toText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<span[^>]*class="[^"]*\b(qual|badge|change-badge|cnt|src-chip)\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** 指定クラスを持つ要素の中身を取り出す（同名タグの入れ子は想定しない） */
function pickByClass(html, cls) {
  const out = [];
  const re = new RegExp(`<(\\w+)[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/\\1>`, 'gi');
  let m;
  while ((m = re.exec(html))) out.push(m[2]);
  return out;
}

const index = {};
let totalTerms = 0;
let skippedTerms = 0;

for (const f of files) {
  if (SKIP.has(f)) continue;
  const abs = path.join(ROOT, f.replace(/\//g, path.sep));
  let full;
  try {
    full = fs.readFileSync(abs, 'utf8');
  } catch (e) {
    console.warn(`skip ${f}: ${e.message}`);
    continue;
  }

  // 手で足したキーワードは、定型見出しの除外にかけない（書いた人の意図を優先する）
  const manual = [];
  const headings = [];

  // <head> の手動キーワード（見出しに出てこない言葉を足す用）
  for (const m of full.matchAll(/<meta[^>]*name="search-keywords"[^>]*content="([^"]*)"[^>]*>/gi)) {
    manual.push(...m[1].split(/[,、]/));
  }

  // <body> より前（CSS など）は見出しを探さない
  const bodyAt = full.indexOf('<body');
  const html = bodyAt > -1 ? full.slice(bodyAt) : full;

  for (const m of html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)) headings.push(m[1]);
  for (const cls of CLASS_NAMES) headings.push(...pickByClass(html, cls));
  for (const m of html.matchAll(/data-keywords="([^"]*)"/gi)) manual.push(m[1]);

  const seen = new Set();
  const terms = [];
  for (const [r, isHeading] of [
    ...manual.map((x) => [x, false]),
    ...headings.map((x) => [x, true]),
  ]) {
    let t = toText(r);
    if (t.length > MAX_LEN) t = t.slice(0, MAX_LEN);
    if (t.length < 2) continue;
    if (isHeading && isSkipTerm(t)) {
      skippedTerms++;
      continue;
    }
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(t);
    if (terms.length >= MAX_TERMS) break;
  }

  if (terms.length) {
    index[f] = terms;
    totalTerms += terms.length;
  }
}

const jsPath = path.join(__dirname, 'search-index.js');
fs.writeFileSync(jsPath, `window.__searchIndex = ${JSON.stringify(index)};\n`, 'utf8');

const kb = (fs.statSync(jsPath).size / 1024).toFixed(1);
console.log(
  `✓ ${Object.keys(index).length} ページ・${totalTerms} 語を索引化（${kb} KB）\n` +
    `  定型見出し ${skippedTerms} 語は索引から除外\n  ${jsPath}`
);
