/**
 * 推敲の進み具合を出す（どのページを次に /推敲 にかけるか決めるため）
 *
 *   node tools-internal/suikou-status.js            … 要点だけ（変更ありと未推敲の上位）
 *   node tools-internal/suikou-status.js --all      … 全ページ
 *   node tools-internal/suikou-status.js --mark 加算まとめ/○○.html "メモ"
 *                                                   … 推敲済みとして台帳に記録する
 *
 * 台帳は tools-internal/suikou-ledger.json。
 * 「変更あり」は、推敲した時点のコミットより後に本文を変えたコミットがあるページ。
 * 最終更新日と同じ考え方で、[表示は変えない] と20ページ以上の一括コミットは数えない
 * （一括の機械置換まで「読み直しが要る」にすると、全ページが常に変更ありになる）。
 * 4〜19ページをまとめて直したコミット（ルールに沿った横断修正）は「横断修正のみ」に分ける。
 * 読み直しが要るのは、そのページのために書き換えたコミット（3ページ以下）があるときだけ。
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LEDGER = path.join(__dirname, 'suikou-ledger.json');
const git = (...args) =>
  execFileSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: ROOT, encoding: 'utf8' }).trim();

const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
const args = process.argv.slice(2);

// ── 記録 ──
if (args[0] === '--mark') {
  const file = (args[1] || '').replace(/\\/g, '/');
  if (!file || !fs.existsSync(path.join(ROOT, file))) {
    console.error('ファイルが見つかりません: ' + file);
    process.exit(1);
  }
  if (git('status', '--porcelain', '--', file)) {
    console.error('未コミットの変更があります。推敲の反映をコミットしてから記録してください（起点のコミットがずれるため）。');
    process.exit(1);
  }
  const commit = git('log', '-1', '--format=%h', '--', file);
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  ledger.reviewed[file] = { date: today, commit, note: args[2] || '' };
  fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');
  console.log(`記録しました: ${file}（${today} / ${commit}）`);
  process.exit(0);
}

// ── 数えないコミット（一括・表示は変えない） ──
const skip = new Set();
const htmlCount = new Map();   // コミットごとの変更HTML数（横断の一括修正かどうかを見る）
{
  const out = git('log', '--format=@@%h\t%s', '--name-only');
  for (const block of out.split('@@').filter(Boolean)) {
    const [head, ...names] = block.trim().split('\n');
    const [hash, subject = ''] = head.split('\t');
    const html = names.filter((n) => n.endsWith('.html')).length;
    htmlCount.set(hash, html);
    if (html >= 20 || subject.includes('[表示は変えない]')) skip.add(hash);
  }
}

// ── 公開ページ ──
const pages = git('ls-files', '*.html')
  .split('\n')
  .filter((f) => f && !/^(draft|private|tools-internal|files)\//.test(f));

const CAT_ORDER = ['事務', 'チェックリスト', 'ツール', '加算まとめ', 'ナレッジ', '改定資料', 'yakureki', '(ハブ)'];
const catOf = (f) => (f.includes('/') ? f.split('/')[0] : '(ハブ)');

const changed = [], sweepOnly = [], done = [], todo = [], excluded = [];
for (const f of pages) {
  if (ledger.exclude[f]) { excluded.push({ f, why: ledger.exclude[f] }); continue; }
  const r = ledger.reviewed[f];
  if (!r) { todo.push({ f, old: (ledger.reviewedOld || {})[f] }); continue; }
  if (!r.commit) { done.push({ f, r }); continue; }   // 未公開で推敲したもの。公開後に --mark で起点を付ける
  let lines = 0, commits = [], own = 0;
  try {
    for (const line of git('log', '--format=%h\t%ad\t%s', '--date=short', `${r.commit}..HEAD`, '--', f).split('\n').filter(Boolean)) {
      const [h, d, s] = line.split('\t');
      if (skip.has(h)) continue;
      const ns = git('show', '--numstat', '--format=', h, '--', f).split('\t');
      lines += (parseInt(ns[0]) || 0) + (parseInt(ns[1]) || 0);
      if ((htmlCount.get(h) || 0) <= 3) own++;
      commits.push(`${d} ${s}`);
    }
  } catch (e) {
    commits.push('（起点のコミットが見つからない: ' + r.commit + '）');
  }
  (own ? changed : commits.length ? sweepOnly : done).push({ f, r, lines, commits });
}

const pri = ledger.priority || [];
todo.sort((a, b) => {
  const pa = pri.indexOf(a.f), pb = pri.indexOf(b.f);
  if (pa !== pb) return (pa < 0 ? 999 : pa) - (pb < 0 ? 999 : pb);
  const ca = CAT_ORDER.indexOf(catOf(a.f)), cb = CAT_ORDER.indexOf(catOf(b.f));
  return ca - cb || a.f.localeCompare(b.f, 'ja');
});
changed.sort((a, b) => b.lines - a.lines);

const ALL = args.includes('--all');
const cap = (list, n) => (ALL ? list : list.slice(0, n));

console.log(`\n推敲の状況（公開 ${pages.length} ページ）`);
console.log(`  推敲済み ${done.length + sweepOnly.length}（うち推敲後は横断修正のみ ${sweepOnly.length}）／ 推敲後に変更あり ${changed.length} ／ 未推敲 ${todo.length} ／ 対象外 ${excluded.length}\n`);

console.log('■ 推敲後に変更あり（変更の多い順）');
if (!changed.length) console.log('  なし');
for (const x of cap(changed, 10)) {
  console.log(`  ${x.f}  … ${x.r.date} に推敲・その後 ${x.commits.length}回／${x.lines}行`);
  for (const c of x.commits.slice(0, 3)) console.log(`      ${c}`);
  if (x.commits.length > 3) console.log(`      ほか${x.commits.length - 3}件`);
}

console.log('\n■ 未推敲（よく読まれている順 → カテゴリー順）');
for (const x of cap(todo, 15)) {
  const mark = pri.includes(x.f) ? '★' : '  ';
  console.log(`  ${mark}${x.f}${x.old ? `  （旧基準で ${x.old.date} に推敲）` : ''}`);
}
if (!ALL && todo.length > 15) console.log(`  … ほか${todo.length - 15}ページ（--all で全部）`);

if (ALL) {
  console.log('\n■ 推敲後は横断修正のみ（読み直しは不要）');
  for (const x of sweepOnly) console.log(`  ${x.f}  … ${x.r.date} に推敲・横断修正 ${x.commits.length}回`);
  console.log('\n■ 推敲済み（その後の変更なし）');
  for (const x of done) console.log(`  ${x.f}  … ${x.r.date}${x.r.note ? '（' + x.r.note + '）' : ''}`);
  console.log('\n■ 対象外');
  for (const x of excluded) console.log(`  ${x.f}  … ${x.why}`);
}
console.log('\n★＝閲覧データで上位のページ。推敲したら --mark で記録する。');
