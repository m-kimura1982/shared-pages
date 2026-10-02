// 疑義解釈検索ツール（ツール/gigi-search.html）の「図・表・例の補い」を点検する。
// 厚労省ツール（xlsm）からデータを取り込み直したあとに必ず回す。
//   node tools-internal/check-gigi-supplements.js
// 1. GIGI_SUPPLEMENTS のうち、データと突き合わなくなったもの（問番号・質問文の頭が変わった等）
// 2. 「※図あり」等があるのに補いのない問（調剤を先に出す。他の分類は件数だけ）
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'ツール', 'gigi-search.html');
const html = fs.readFileSync(file, 'utf8');

const dataLine = html.split('\n').find(l => l.startsWith('const ALL_DATA = '));
if (!dataLine) { console.error('ALL_DATA の行が見つからない'); process.exit(1); }
const ALL_DATA = JSON.parse(dataLine.replace(/^const ALL_DATA = /, '').replace(/;\s*$/, ''));

const m = html.match(/const GIGI_SUPPLEMENTS = (\[[\s\S]*?\n\]);/);
if (!m) { console.error('GIGI_SUPPLEMENTS が見つからない（消えていないか確認する）'); process.exit(1); }
const SUPPS = eval(m[1]);
const MARK = /※[^。\s]{0,8}あり/;

let ng = 0;
const matched = new Set();
console.log(`補い ${SUPPS.length}件`);
for (const s of SUPPS) {
  const d = ALL_DATA.find(x => x.nendo === s.nendo && x.title === s.title && x.bunrui === s.bunrui
    && String(x.mondai) === s.mondai && (x.q || '').startsWith(s.qHead));
  if (d) matched.add(d);
  else { ng++; console.log(`  【要修正】突き合わない：${s.nendo} ${s.title} ${s.bunrui} 問${s.mondai}`); }
}

const missing = ALL_DATA.filter(d => MARK.test((d.q || '') + (d.a || '')) && !matched.has(d));
const chozai = missing.filter(d => d.bunrui === '調剤');
console.log(`\n図・表・例があるのに補いのない問：${missing.length}件（うち調剤 ${chozai.length}件）`);
for (const d of chozai) console.log(`  【調剤】${d.nendo} ${d.title} 問${d.mondai}：${(d.q || '').slice(0, 40)}`);
const byBunrui = {};
missing.filter(d => d.bunrui !== '調剤').forEach(d => { byBunrui[d.bunrui] = (byBunrui[d.bunrui] || 0) + 1; });
if (Object.keys(byBunrui).length) console.log('  その他：' + Object.entries(byBunrui).map(([k, v]) => `${k} ${v}`).join('／') + '（原本で確認する旨の注記は自動で出る）');

if (ng) process.exit(1);
