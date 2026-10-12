#!/usr/bin/env node
/**
 * check-dates.js ─ 期限切れの点検係
 *
 * 公開ページの本文から「○年○月○日まで」「○月末まで」「経過措置」「から適用」のような
 * 期限・施行日つきの記述を集め、すでに過ぎたものと、近いうちに来るものを一覧にする。
 * 直しはしない。過ぎていても、経緯として残すのが正しい記述も多い（「〜までは旧点数」など）。
 *
 *   node tools-internal/check-dates.js            過ぎたもの＋60日以内に来るもの
 *   node tools-internal/check-dates.js --days 90  先の範囲を変える
 *   node tools-internal/check-dates.js 加算まとめ/調剤管理料_2026改定.html
 *
 * 見ないページ：正本（通知・告示をそのまま載せているもの）と更新履歴。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIRS = ['加算まとめ', 'チェックリスト', '改定資料', 'ツール', 'ナレッジ', '事務', 'yakureki'];
const ROOT_PAGES = ['index.html', '加算まとめ.html', 'checklists.html', 'kaitei2026.html', 'tools.html', 'knowledge.html', '事務スタッフ向け.html'];
const SKIP = [
  '改定資料/別添3_調剤報酬点数表に関する事項2026.html', '改定資料/別表第三_調剤報酬点数表2026.html',
  '改定資料/別表Ⅰ_調剤報酬明細書摘要欄記載事項2026.html', '改定資料/別表Ⅴ_調剤行為名称等の略号一覧2026改定.html',
  '改定資料/疑義解釈まとめ2026.html', '改定資料/特掲診療料_施設基準届出_調剤関係2026.html',
  '改定資料/記載要領_調剤報酬請求書及び明細書2026.html', 'ツール/gigi-search.html',
];

const argDays = process.argv.indexOf('--days');
const AHEAD = argDays > 0 ? +process.argv[argDays + 1] : 60;
const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);

// 期限・施行を表す語が近くにある日付だけ拾う（単なる「○年○月○日 公表」は拾わない）
const CUE = /まで|末日|末まで|以降|から適用|から施行|より施行|施行|適用|経過措置|期限|延長|猶予|開始|廃止|終了|切り替/;

// 過ぎた日付で問題になるのは「まだ続いている」と読める書き方だけ。施行日などの経緯は拾わない
const CUE_PAST = /まで|猶予|経過措置|予定|期限|延長/;
const DONE = /廃止された|切れた|終了した|適用済|反映|出典|施行事項|施行）|施行\)|時点/;

const z2h = s => s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
const REIWA = 2018;

/** 文中の日付を {date, raw} で返す。日が無いもの（○月末・○月）は月末として扱う */
function findDates(text) {
  const out = [];
  const t = z2h(text);
  const re = /(令和\s*(元|\d{1,2})\s*年|(20\d{2})\s*年)\s*(\d{1,2})\s*月\s*(?:(\d{1,2})\s*日|(末))?/g;
  let m;
  while ((m = re.exec(t))) {
    const y = m[3] ? +m[3] : REIWA + (m[2] === '元' ? 1 : +m[2]);
    const mo = +m[4];
    const d = m[5] ? +m[5] : new Date(y, mo, 0).getDate();   // 日が無ければ月末
    out.push({ date: new Date(y, mo - 1, d), raw: m[0].replace(/\s+/g, ''), index: m.index, exactDay: !!m[5] });
  }
  return out;
}

function targets() {
  const args = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--days');
  if (args.length) return args.map(a => a.replace(/\\/g, '/'));
  const list = ROOT_PAGES.filter(p => fs.existsSync(path.join(ROOT, p)));
  for (const dir of PUBLIC_DIRS)
    for (const f of fs.readdirSync(path.join(ROOT, dir)))
      if (f.endsWith('.html') && !SKIP.includes(dir + '/' + f)) list.push(dir + '/' + f);
  return list;
}

const days = d => Math.round((d - TODAY) / 86400000);
const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const past = [], soon = [];
for (const rel of targets()) {
  const html = fs.readFileSync(path.join(ROOT, rel), 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '')
    // 原文の自動生成部分・原文の折りたたみは見ない（通知の文面なので直す対象ではない）
    .replace(/<div class="orig">[\s\S]*?<div class="cite">[\s\S]*?<\/div>\s*<\/div>/g, '');
  const lines = html.split('\n').map(l => l.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim());
  lines.forEach((line, i) => {
    if (!line) return;
    for (const hit of findDates(line)) {
      const around = z2h(line).slice(Math.max(0, hit.index - 15), hit.index + hit.raw.length + 20);
      if (!CUE.test(around)) continue;
      const n = days(hit.date);
      const row = { rel, line: i + 1, raw: hit.raw, date: hit.date, n, text: line.length > 90 ? line.slice(0, 90) + '…' : line };
      if (n < 0) { if (CUE_PAST.test(around) && !DONE.test(line)) past.push(row); } else if (n <= AHEAD) soon.push(row);
    }
  });
}

const print = (rows, title) => {
  if (!rows.length) return;
  console.log(`\n=== ${title}（${rows.length}件）`);
  let cur = '';
  for (const r of rows.sort((a, b) => a.rel.localeCompare(b.rel) || a.line - b.line)) {
    if (r.rel !== cur) { console.log(`\n■ ${r.rel}`); cur = r.rel; }
    const when = r.n < 0 ? `${-r.n}日前` : r.n === 0 ? '今日' : `あと${r.n}日`;
    console.log(`  ${r.rel}:${r.line}  ${r.raw}（${fmt(r.date)}・${when}）`);
    console.log(`      ${r.text}`);
  }
};

print(soon, `これから来る期限（${AHEAD}日以内）`);
print(past, '過ぎた期限（経緯として正しいものも多い。読者が「今もそうだ」と読む書き方になっていないかを見る）');
console.log(`\nこれから ${soon.length}件 / 過ぎた ${past.length}件（今日 ${fmt(TODAY)}）`);
