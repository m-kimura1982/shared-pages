// サイトアイコン生成：文字を図形にした SVG と、PNG・ICO を作る（2026-11-22）
// 使い方：このフォルダで npm i opentype.js@1.3.4 @resvg/resvg-js@2.6.2 --no-save → node gen.js → out/ を assets/icons/ へ。
// 書体は Noto Sans JP 900 の「調剤報酬薬歴まとめ」だけの部分ファイル（Google Fonts の text= で取得）。
// 描き直したら site-header.js の ICON_V と、index.html・updates.html・404.html の ?v= を上げる。
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');
const { Resvg } = require('@resvg/resvg-js');

const font = opentype.loadSync(path.join(__dirname, 'font/noto900.ttf'));
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

const K = '#1d2433', B = '#1e5fa8', T = '#e4eef9', Y = '#fff59d';

const adv = (s, size) => font.getAdvanceWidth(s, size);
const p = (s, x, y, size, fill) =>
  `<path fill="${fill}" d="${font.getPath(s, x, y, size).toPathData(2)}"/>`;

// タブ用：淡い青の角丸に紺の「調」＋黄マーカー
function tabSvg() {
  const size = 38;
  const g = font.getPath('調', 0, 0, size).getBoundingBox();
  const x = 32 - (g.x1 + g.x2) / 2;
  const y = 32 - (g.y1 + g.y2) / 2 + 1;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="12" fill="${T}"/>` +
    `<rect x="10" y="${(y - 14).toFixed(2)}" width="44" height="15" fill="${Y}"/>` +
    p('調', x, y, size, K) + `</svg>`;
}

// ホーム画面用：2行。scale<1 で中央に縮める（maskable 用）
function homeSvg(scale = 1) {
  const size = 10.5;
  const w = adv('薬歴まとめ', size);
  const x0 = (64 - w) / 2;
  const y1 = 28.2, y2 = 43.7;
  const xm = x0 + adv('薬歴', size);
  const inner =
    p('調剤報酬', x0, y1, size, K) +
    `<rect x="${(xm - 0.6).toFixed(2)}" y="${(y2 - 5.6).toFixed(2)}" width="${(adv('まとめ', size) + 1.2).toFixed(2)}" height="6.8" fill="${Y}"/>` +
    p('薬歴', x0, y2, size, K) +
    p('まとめ', xm, y2, size, B);
  const t = scale === 1 ? '' : ` transform="translate(${32 - 32 * scale} ${32 - 32 * scale}) scale(${scale})"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" fill="${T}"/><g${t}>${inner}</g></svg>`;
}

const png = (svg, n) => new Resvg(svg, { fitTo: { mode: 'width', value: n } }).render().asPng();

const tab = tabSvg();
const home = homeSvg();
const mask = homeSvg(0.78);

fs.writeFileSync(path.join(OUT, 'favicon.svg'), tab + '\n');
fs.writeFileSync(path.join(OUT, 'favicon.png'), png(tab, 32));
fs.writeFileSync(path.join(OUT, 'apple-touch-icon.png'), png(home, 180));
fs.writeFileSync(path.join(OUT, 'icon-192.png'), png(home, 192));
fs.writeFileSync(path.join(OUT, 'icon-512.png'), png(home, 512));
fs.writeFileSync(path.join(OUT, 'icon-maskable-512.png'), png(mask, 512));
fs.writeFileSync(path.join(OUT, 'home-preview.svg'), home + '\n');

// ICO（PNG を 16・32・48 で格納）
const sizes = [16, 32, 48];
const imgs = sizes.map((n) => png(tab, n));
const head = Buffer.alloc(6 + 16 * sizes.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
let off = head.length;
sizes.forEach((n, i) => {
  const e = 6 + 16 * i;
  head.writeUInt8(n, e); head.writeUInt8(n, e + 1);
  head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3);
  head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
  head.writeUInt32LE(imgs[i].length, e + 8); head.writeUInt32LE(off, e + 12);
  off += imgs[i].length;
});
fs.writeFileSync(path.join(OUT, 'favicon.ico'), Buffer.concat([head, ...imgs]));

console.log(fs.readdirSync(OUT).map((f) => f + ' ' + fs.statSync(path.join(OUT, f)).size).join('\n'));
