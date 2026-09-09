/**
 * 文字色のコントラストを実測して、薄すぎる指定を洗い出す
 *
 * 実行: node assets/check-contrast.js              公開ページ全部
 *       node assets/check-contrast.js 加算まとめ/調剤管理料_2026改定.html
 *       node assets/check-contrast.js --ng          「要修正」だけ
 *
 * 2026-09-10 に22ページの文字が読めない濃さになっていた。原因のほとんどは
 * 罫線用の --border-dk(#9ca3af) や #888〜#bbb を文字色に流用したことで、
 * 見た目では気づけなかった（薄いグレーは「補助テキストらしく」見えてしまう）。
 * 目で見て判断せず、コントラスト比を計算して出す。
 *
 * 判定は WCAG AA と同じ 4.5:1（24px以上、または18.66px以上の太字は 3:1）。
 *
 * 背景は「同じルールの中で背景色も指定していればそれ」「無ければ白」とみなす。
 * カードの中が白なので、ほとんどの本文はこれで合う。淡い色の上に載せている
 * 文字は同じルールに background があるはずなので、そこで拾える。
 *
 * ・要修正 … 本文・ラベルとして読ませる文字が基準を下回っている
 * ・確認   … 矢印・「・」・チェック枠など、読まなくても意味が通る記号かもしれないもの
 *            （CLAUDE.md はこれらが薄いのを許容している）。目視で判断する。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
// build-page-meta.js / build-search-index.js の PUBLIC_DIRS と揃える
const PUBLIC_DIRS = ['yakureki', '加算まとめ', '改定資料', 'チェックリスト', 'ツール', 'ナレッジ', '事務'];
const BS = String.fromCharCode(92);

/** 記号かもしれない＝「確認」に回すセレクタ・文脈 */
const SYMBOL_HINTS = [
  '::before', '::after', ':before', ':after', '::placeholder', ':placeholder',
  'svg', 'first-child', 'bullet', 'arrow', 'arw', 'chev', 'caret', 'marker',
  'icon', 'dash', 'sep', 'divider', 'num-label', '← 記号',
];

/* ── 色まわり ───────────────────────────── */
const NAMED = { white: '#ffffff', black: '#000000', gray: '#808080', grey: '#808080', red: '#ff0000', transparent: null, inherit: null, currentcolor: null };

function toHex(v, vars, depth = 0) {
  if (!v || depth > 6) return null;
  let s = v.trim().replace(/\s*!important\s*$/i, '').toLowerCase();
  const m = s.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]+))?\)$/);
  if (m) {
    const hit = vars[m[1]];
    if (hit !== undefined) return toHex(hit, vars, depth + 1);
    return m[2] ? toHex(m[2], vars, depth + 1) : null;   // 未定義なら fallback を見る
  }
  if (NAMED[s] !== undefined) return NAMED[s];
  let h = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (h) return h[1].length === 3 ? '#' + h[1].split('').map(c => c + c).join('') : '#' + h[1];
  const rgb = s.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const p = rgb[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat);
    if (p.length >= 3) {
      if (p[3] !== undefined && p[3] < 0.9) return null;   // 半透明は判定しない
      return '#' + p.slice(0, 3).map(n => Math.round(n).toString(16).padStart(2, '0')).join('');
    }
  }
  return null;
}
const lum = h => {
  const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/* ── ファイル集め ───────────────────────── */
function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (/^(\.git|node_modules|draft|tools-internal|files|private|\.claude)$/.test(e.name)) continue;
    if (e.name.startsWith('images')) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

/* ── 1ファイルを見る ─────────────────────── */
function checkFile(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const styles = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');

  // :root などで定義された変数を集める（後勝ち＝メディアクエリ内の上書きも拾う）
  const vars = {};
  for (const m of styles.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)[;}]/g)) vars[m[1]] = m[2].trim();

  // 同じクラスに色指定が複数あるもの＝状態で塗り替わる（.j-chip と .j-chip.ineligible など）。
  // どちらが効くかはこのスクリプトには分からないので「確認」に回す。
  const colorCount = {};
  for (const m of styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/(^|[;\s])color\s*:/.test(m[2])) continue;
    for (const c of m[1].match(/\.[\w-]+/g) || []) colorCount[c] = (colorCount[c] || 0) + 1;
  }

  const ng = [], warn = [];
  const seen = new Set();

  const judge = (color, bgRaw, fsRaw, fwRaw, where, sample) => {
    const fg = toHex(color, vars);
    if (!fg) return;
    // 明るい文字色は、色の付いた背景に載せる前提。背景が別のルールにあって
    // ここからは分からないので判定しない（白文字を誤検出しないため）。
    if (lum(fg) > 0.5) return;
    const bg = toHex(bgRaw, vars) || '#ffffff';
    const size = parseFloat(fsRaw) || 16;
    const weight = parseInt(fwRaw, 10) || 400;
    const big = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = big ? 3 : 4.5;
    const cr = contrast(fg, bg);
    if (cr >= need) return;
    const key = where + '|' + fg + '|' + bg;
    if (seen.has(key)) return;
    seen.add(key);
    const low = where.toLowerCase();
    const row = {
      cr: cr.toFixed(2), need, fg, bg,
      where: where.length > 74 ? where.slice(0, 74) + '…' : where,
      sample: (sample || '').replace(/\s+/g, ' ').trim().slice(0, 30),
    };
    const isSymbol = SYMBOL_HINTS.some(h => low.includes(h));
    const overridden = (where.match(/\.[\w-]+/g) || []).some(c => colorCount[c] > 1);
    const borderline = cr >= need - 0.15;   // 既定パレット（--amber on --amber-bg = 4.48）を弾かない
    (isSymbol || overridden || borderline ? warn : ng).push(row);
  };

  // 1) <style> の中のルール
  for (const m of styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].replace(/\s+/g, ' ').trim();
    const body = m[2];
    if (sel.startsWith('@') || !/(^|[;\s])color\s*:/.test(body)) continue;
    const color = (body.match(/(?:^|[;\s])color\s*:\s*([^;]+)/) || [])[1];
    const bg = (body.match(/background(?:-color)?\s*:\s*([^;]+)/) || [])[1];
    const fsz = (body.match(/font-size\s*:\s*([^;]+)/) || [])[1];
    const fw = (body.match(/font-weight\s*:\s*([^;]+)/) || [])[1];
    judge(color, bg && bg.split(/\s+/)[0], resolveSize(fsz, vars), fw, sel, '');
  }

  // 2) インライン style（その要素が直接持つ文字だけを見る。次のタグの手前まで）
  for (const m of src.matchAll(/<(\w+)[^>]*\sstyle="([^"]*)"[^>]*>([^<]{0,40})/g)) {
    const body = m[2];
    if (!/(^|[;\s])color\s*:/.test(body)) continue;
    const color = (body.match(/(?:^|[;\s])color\s*:\s*([^;]+)/) || [])[1];
    const bg = (body.match(/background(?:-color)?\s*:\s*([^;]+)/) || [])[1];
    const fsz = (body.match(/font-size\s*:\s*([^;]+)/) || [])[1];
    const fw = (body.match(/font-weight\s*:\s*([^;]+)/) || [])[1];
    const text = m[3].trim();
    // 中身が記号だけ（・ ＋ → ▶ ✓ × など）なら、読まなくても意味が通るので薄くてよい。
    // 「・」は KATAKANA MIDDLE DOT でカタカナの範囲に入るため、記号として先に落とす。
    const SYMBOLS = /[\s・･＋+\-−–—─‐→←↑↓⇒▶▸►▼▲◀✓✔✕✖×※〜~｜|/／＼＼、。，．：:；;（）()［］[\]「」『』【】〈〉<>◯○●◎◆◇■□★☆＊*†‡…‥]/g;
    const symbolOnly = text.length > 0 && text.replace(SYMBOLS, '') === '';
    judge(color, bg && bg.split(/\s+/)[0], resolveSize(fsz, vars), fw,
      '<' + m[1] + ' style="…color:' + (color || '').trim() + '">' + (symbolOnly ? ' ← 記号' : ''), text);
  }
  return { ng, warn };
}

/** font-size: var(--text-xs) のような指定を px に開く */
function resolveSize(raw, vars) {
  if (!raw) return '16';
  let s = raw.trim();
  for (let i = 0; i < 4; i++) {
    const m = s.match(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/);
    if (!m) break;
    s = vars[m[1]] !== undefined ? vars[m[1]] : (m[2] || '16px');
  }
  const px = s.match(/([\d.]+)\s*px/);
  return px ? px[1] : '16';
}

/* ── 実行 ───────────────────────────────── */
const args = process.argv.slice(2);
const ngOnly = args.includes('--ng');
const targets = args.filter(a => !a.startsWith('--'));

let files;
if (targets.length) {
  files = targets.map(t => t.split(BS).join('/').replace(/^\.\//, ''));
} else {
  files = walk(ROOT)
    .map(f => path.relative(ROOT, f).split(BS).join('/'))
    .filter(f => PUBLIC_DIRS.includes(f.split('/')[0]) || !f.includes('/'));
}

let ngTotal = 0, warnTotal = 0;
for (const f of files) {
  if (!fs.existsSync(path.join(ROOT, f))) { console.log('× ファイルがない: ' + f); continue; }
  const { ng, warn } = checkFile(f);
  ngTotal += ng.length; warnTotal += warn.length;
  if (!ng.length && (ngOnly || !warn.length)) continue;
  console.log('\n' + f);
  for (const r of ng) {
    console.log('  要修正  比 ' + r.cr + '（必要 ' + r.need + '）  ' + r.fg + ' on ' + r.bg);
    console.log('          ' + r.where + (r.sample ? '   例:' + r.sample : ''));
  }
  if (!ngOnly) for (const r of warn) {
    console.log('  確認    比 ' + r.cr + '（必要 ' + r.need + '）  ' + r.fg + ' on ' + r.bg);
    console.log('          ' + r.where + '   ← 記号なら薄くてよい');
  }
}

console.log('\n要修正 ' + ngTotal + '件 / 確認 ' + warnTotal + '件（' + files.length + 'ページ）');
if (!ngTotal) console.log('読ませる文字で基準を下回るものは無かった。');
else console.log('補助テキストは --txt-3（#5e6470）にする。--border-dk と #888〜#bbb は文字色に使わない。');
