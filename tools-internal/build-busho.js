#!/usr/bin/env node
/**
 * build-busho.js ─ 部署の一覧ページを作る
 *
 * 名簿の正本は .claude/commands/部署.md の表（<!-- busho-table --> の間）。
 * そこから private/部署一覧.html を作る（git に入らない。ブラウザで直接開く）。
 * .claude/commands と .claude/agents にあるのに表に載っていないものは「名簿にない」として出す。
 *
 *   node tools-internal/build-busho.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, '.claude/commands/部署.md');
const OUT = path.join(ROOT, 'private/部署一覧.html');

const md = fs.readFileSync(SRC, 'utf8');
const table = (md.match(/<!-- busho-table -->([\s\S]*?)<!-- \/busho-table -->/) || [])[1] || '';
const rows = table.trim().split('\n').slice(2).map(l => l.split('|').slice(1, -1).map(c => c.trim()));
const people = rows.map(([group, name, role, call, when, file]) => ({ group, name, role, call: call.replace(/`/g, ''), when, file }));

// 名簿にないコマンド・エージェント
const listed = new Set(people.map(p => p.file));
const unlisted = [];
for (const [dir, ext] of [['.claude/commands', '.md'], ['.claude/agents', '.md']]) {
  for (const f of fs.readdirSync(path.join(ROOT, dir))) {
    const rel = `${dir}/${f}`;
    if (!f.endsWith(ext) || f === '部署.md' || listed.has(rel)) continue;
    // 呼び出し役のコマンド（/通読 → first-reader）は、エージェント側が名簿にあればよい
    if (['通読.md', '照合.md', '期限点検.md', '厚労省チェック.md'].includes(f)) continue;
    const desc = (fs.readFileSync(path.join(ROOT, rel), 'utf8').match(/^description:\s*(.+)$/m) || [])[1] || '';
    unlisted.push({ rel, desc });
  }
}

// ── 作業中の棚（draft/ のファイルを新しい順に。一言は private/作業中メモ.json） ──
const NOTES_FILE = path.join(ROOT, 'private/作業中メモ.json');
const NOTES = fs.existsSync(NOTES_FILE) ? JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8')).notes : {};
const noteOf = rel => {
  // ファイル名で一致 → いちばん長いフォルダ名で一致
  if (NOTES[rel] !== undefined) return typeof NOTES[rel] === 'string' ? { note: NOTES[rel] } : NOTES[rel];
  const dirs = Object.keys(NOTES).filter(k => k.endsWith('/') && rel.startsWith(k)).sort((a, b) => b.length - a.length);
  if (!dirs.length) return {};
  const v = NOTES[dirs[0]];
  return typeof v === 'string' ? { note: v } : v;
};
const PUBLIC_DIRS = ['yakureki', '加算まとめ', '改定資料', 'チェックリスト', 'ツール', 'ナレッジ', '事務'];
const wip = [];
(function walk(dir) {
  for (const e of fs.readdirSync(path.join(ROOT, 'draft', dir), { withFileTypes: true })) {
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isDirectory()) { walk(rel); continue; }
    if (!/\.(html|md)$/.test(e.name)) continue;
    const n = noteOf(rel);
    if (n.hide) continue;
    const mtime = fs.statSync(path.join(ROOT, 'draft', rel)).mtime;
    // 公開フォルダに同じ名前のページがあれば「刷新中」
    const top = rel.split('/')[0];
    const published = PUBLIC_DIRS.includes(top) && fs.existsSync(path.join(ROOT, rel));
    wip.push({ rel, mtime, note: n.note || '', published, folder: rel.includes('/') ? rel.split('/')[0] : '（直下）' });
  }
})('');
wip.sort((a, b) => b.mtime - a.mtime);
const daysAgo = d => Math.floor((Date.now() - d) / 86400000);

const flow = (md.match(/\*\*ふだんの流れ\*\*：(.+)/) || [])[1] || '';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 分類ごとの色（サイトの図解の淡色パレットから）
const COLORS = {
  執筆: ['#f3e8d0', '#7a5718'], 点検: ['#dfe9f6', '#2a5580'], 公開: ['#e3efe0', '#3d6b2e'],
  情報収集: ['#e5e0f2', '#4b3f80'], 自動: ['#f2f2f2', '#444444'],
};
const groups = [...new Set(people.map(p => p.group))];
const today = new Date().toLocaleDateString('ja-JP');

const card = p => `
      <div class="card">
        <div class="name">${esc(p.name)}</div>
        <div class="role">${esc(p.role)}</div>
        <dl>
          <dt>呼び方</dt><dd><code>${esc(p.call)}</code></dd>
          <dt>いつ</dt><dd>${esc(p.when)}</dd>
          <dt>中身</dt><dd><a href="../${encodeURI(p.file)}">${esc(p.file)}</a></dd>
        </dl>
      </div>`;

const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>部署の一覧</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap" rel="stylesheet" />
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:"Noto Sans JP",sans-serif; background:#f3f4f6; color:#222; line-height:1.7; padding:28px 16px 60px; }
  .page { max-width:1100px; margin:0 auto; }
  h1 { font-size:24px; font-weight:900; }
  .lead { color:#444; font-size:14px; margin:4px 0 18px; }
  .boss { display:inline-block; background:#fff; border:1px solid #1e5fa8; color:#1e5fa8; font-weight:900; padding:6px 16px; border-radius:8px; }
  .flow { background:#fff; border:0.5px solid #d1d5db; border-radius:10px; padding:12px 16px; margin:14px 0 22px; font-size:14px; }
  .flow b { color:#1e5fa8; }
  .groups { display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:16px; align-items:start; }
  .group { border-radius:12px; padding:12px; }
  .group h2 { font-size:15px; font-weight:900; margin:0 4px 10px; display:flex; justify-content:space-between; }
  .group h2 span { font-weight:700; font-size:13px; }
  .card { background:#fff; border-radius:8px; padding:12px 14px; margin-top:10px; border:0.5px solid #d1d5db; }
  .name { font-weight:900; font-size:16px; }
  .role { font-size:14px; margin:2px 0 8px; }
  dl { display:grid; grid-template-columns:4em 1fr; gap:2px 8px; font-size:13px; }
  dt { color:#5e6470; }
  dd { word-break:break-all; }
  code { background:#eef2f7; padding:1px 6px; border-radius:4px; font-size:13px; }
  a { color:#1e5fa8; }
  .warn { background:#fdebdd; color:#9a4414; border-radius:10px; padding:12px 16px; margin-top:22px; font-size:14px; }
  .howto { background:#fff; border:0.5px solid #d1d5db; border-radius:10px; padding:14px 18px; margin-top:22px; font-size:14px; }
  .howto h2 { font-size:15px; margin-bottom:6px; }
  .howto li { margin-left:1.4em; }
  .foot { color:#5e6470; font-size:12px; margin-top:16px; }
  .shelf { background:#fff; border:0.5px solid #d1d5db; border-radius:10px; padding:14px 18px; margin-top:22px; }
  .shelf h2 { font-size:17px; font-weight:900; }
  .shelf h2 span { font-size:13px; font-weight:700; color:#5e6470; margin-left:8px; }
  .shelf-lead { font-size:13px; color:#444; margin:4px 0 10px; }
  .shelf table { width:100%; border-collapse:collapse; font-size:13.5px; }
  .shelf th { text-align:left; color:#5e6470; font-weight:700; border-bottom:1px solid #d1d5db; padding:6px 8px; }
  .shelf td { border-bottom:0.5px solid #e5e7eb; padding:7px 8px; vertical-align:top; word-break:break-all; }
  .shelf td.when { white-space:nowrap; }
  .shelf small { color:#5e6470; }
  .tag { display:inline-block; font-size:12px; font-weight:700; padding:0 7px; border-radius:4px; margin-right:6px; }
  .tag.renew { background:#dfe9f6; color:#2a5580; }
  .tag.stale { background:#f2f2f2; color:#444; }
  
</style>
</head>
<body>
<div class="page">
  <h1>部署の一覧</h1>
  <p class="lead">調剤報酬・薬歴まとめサイトの作業を、役割ごとに分けた担当の一覧。どれもClaude Codeの中で動く。</p>
  <div class="boss">最終判断：木村さん</div>
  <div class="flow"><b>ふだんの流れ</b>　${esc(flow).replace(/`([^`]+)`/g, '<code>$1</code>')}</div>

  <div class="groups">
${groups.map(g => {
  const [bg, fg] = COLORS[g] || ['#f2f2f2', '#444'];
  const ps = people.filter(p => p.group === g);
  return `    <section class="group" style="background:${bg}">
      <h2 style="color:${fg}">${esc(g)}<span>${ps.length}</span></h2>${ps.map(card).join('')}
    </section>`;
}).join('\n')}
  </div>
${unlisted.length ? `
  <div class="warn"><b>名簿にない担当</b>（.claude/ にあるのに部署.md の表に載っていない）<br />${unlisted.map(u => `${esc(u.rel)}　${esc(u.desc)}`).join('<br />')}</div>` : ''}

  <section class="shelf">
    <h2>作業中の棚 <span>draft/ にあるもの・${wip.length}件・新しい順</span></h2>
    <p class="shelf-lead">draft/ に置いた下書きを自動で並べている。<b>止まっている</b>＝30日以上さわっていない。<b>刷新中</b>＝同じ名前の公開ページがある（差し替え前）。一言は private/作業中メモ.json に書く。</p>
    <table>
      <thead><tr><th>ファイル</th><th>最終更新</th><th>状態・メモ</th></tr></thead>
      <tbody>
${wip.map(w => {
  const d = daysAgo(w.mtime);
  const tags = [w.published ? '<span class="tag renew">刷新中</span>' : '', d >= 30 ? '<span class="tag stale">止まっている</span>' : ''].join('');
  return `        <tr><td><a href="../draft/${encodeURI(w.rel)}">${esc(w.rel)}</a></td><td class="when">${w.mtime.getMonth() + 1}/${w.mtime.getDate()}<br /><small>${d}日前</small></td><td>${tags}${esc(w.note)}</td></tr>`;
}).join('\n')}
      </tbody>
    </table>
  </section>

  <div class="howto">
    <h2>部署を足す・変えるとき</h2>
    <ul>
      <li>名簿の正本は <code>.claude/commands/部署.md</code> の表。1行足して、Claude に「部署一覧を作り直して」と頼む（<code>node tools-internal/build-busho.js</code>）</li>
      <li>新しい部署の中身（指示書）は、別の目で見る担当なら <code>.claude/agents/</code>、手順なら <code>.claude/commands/</code> に置く</li>
      <li>呼ばなくても動かしたいもの（保存のたびのチェック）は自動検品に1項目足す（<code>assets/check-page.js</code>）</li>
    </ul>
  </div>
  <p class="foot">${today} に .claude/commands/部署.md から自動で作成。このファイルは git に入らない（private/）。</p>
</div>
</body>
</html>
`;

fs.writeFileSync(OUT, html);
console.log(`private/部署一覧.html を作った（${people.length}部署${unlisted.length ? `・名簿にない ${unlisted.length}件` : ''}）`);
