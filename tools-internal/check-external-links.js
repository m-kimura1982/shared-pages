/* 外部リンクの生存確認
   指定したフォルダ（またはファイル）の HTML から https:// のリンクを拾い、開けるかを確かめる。
   ページ内の <script> に書いたURL（ガイドライン一覧の GL 配列など）も拾う。
   J+'2020/01/…' のような「定数＋文字列」は、同じファイル内の var X = 'https://…' を展開して拾う。

     node tools-internal/check-external-links.js draft/疾患
     node tools-internal/check-external-links.js draft/疾患/ガイドライン.html

   出力：開けないものだけ「NG」で出す。全部開ければ件数だけ。 */
'use strict';
const fs = require('fs');
const path = require('path');

const target = process.argv[2];
if (!target) { console.error('使い方: node tools-internal/check-external-links.js <フォルダかファイル>'); process.exit(1); }

const SKIP = /fonts\.googleapis|fonts\.gstatic|goatcounter|gc\.zgo\.at/;

function htmlFiles(p) {
  const st = fs.statSync(p);
  if (st.isFile()) return p.endsWith('.html') ? [p] : [];
  return fs.readdirSync(p).filter(f => f.endsWith('.html')).map(f => path.join(p, f));
}

function urlsIn(text) {
  const out = new Set();
  // 定数の展開：var J = 'https://…';  →  J+'xxx'
  const consts = {};
  for (const m of text.matchAll(/(?:var|const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*['"](https:\/\/[^'"]+)['"]/g)) consts[m[1]] = m[2];
  for (const [name, base] of Object.entries(consts)) {
    const re = new RegExp('(?<![\\w$])' + name.replace(/\$/g, '\\$') + "\\s*\\+\\s*['\"]([^'\"]+)['\"]", 'g');
    for (const m of text.matchAll(re)) out.add(base + m[1]);
  }
  for (const m of text.matchAll(/https:\/\/[^\s"'<>)\\]+/g)) {
    const u = m[0].replace(/[.,、。]+$/, '');
    if (Object.values(consts).includes(u)) continue;  // 定数そのもの（ディレクトリ）は確かめない
    out.add(u);
  }
  return [...out].filter(u => !SKIP.test(u));
}

async function check(url) {
  const opt = { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (link check)' } };
  try {
    let r = await fetch(url, { ...opt, method: 'HEAD' });
    if (r.status === 405 || r.status === 403 || r.status === 501) r = await fetch(url, { ...opt, method: 'GET' });
    return r.status;
  } catch (e) { return 'ERR ' + (e.cause && e.cause.code || e.message); }
}

(async () => {
  const where = new Map();  // url -> [files]
  for (const f of htmlFiles(target)) {
    for (const u of urlsIn(fs.readFileSync(f, 'utf8'))) {
      if (!where.has(u)) where.set(u, []);
      where.get(u).push(path.basename(f));
    }
  }
  const urls = [...where.keys()];
  let ng = 0, i = 0;
  const workers = Array.from({ length: 4 }, async () => {
    while (i < urls.length) {
      const u = urls[i++];
      const s = await check(u);
      if (!(typeof s === 'number' && s < 400)) {
        ng++;
        console.log('NG ' + s + '  ' + u + '\n     ← ' + [...new Set(where.get(u))].join('、'));
      }
    }
  });
  await Promise.all(workers);
  console.log((ng ? '\n' : '') + '外部リンク ' + urls.length + '件 / 開けない ' + ng + '件');
  process.exit(ng ? 1 : 0);
})();
