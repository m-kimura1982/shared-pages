// private/・draft/・tools-internal/・.claude/ と、まだコミットしていないファイルを、このPCのデスクトップの予備フォルダへコピーする。
// どちらも USB の上にしかない（private/ は git に入らず、draft/ はコミットを指示したときだけ入る）ので、USB が壊れたときの控え。
// 上書きと追加だけで、USB 側で消したファイルは予備から消さない（間違えて消したときに戻せるように）。
// 定期実行（厚労省チェック）の手順0で回す（.claude/commands/厚労省チェック.md）。手で回してもよい。
//
//   node tools-internal/backup-private.js
//   node tools-internal/backup-private.js "C:/別の/コピー先"
'use strict';
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DEST = process.argv[2] || path.join(os.homedir(), 'Desktop', 'サイトの控え（USB）');
// tools-internal/ と .claude/ は git に入るが、コミット前の新しいスクリプト・指示書が溜まるので丸ごと控える（2026-11-17）
const DIRS = ['private', 'draft', 'tools-internal', '.claude'];

fs.mkdirSync(DEST, { recursive: true });
let failed = false;
for (const d of DIRS) {
  const r = spawnSync('robocopy', [
    path.join(ROOT, d), path.join(DEST, d),
    '/E', '/R:1', '/W:1', '/NFL', '/NDL', '/NJH', '/NJS', '/NP',
  ], { encoding: 'utf8' });
  // robocopy は 0〜7 が成功（1=コピーした、0=変更なし）、8 以上が失敗
  if (r.status === null || r.status >= 8) {
    failed = true;
    console.log(`× ${d}/ のコピーに失敗（robocopy ${r.status}）`);
  } else {
    console.log(`○ ${d}/ → ${path.join(DEST, d)}${r.status === 0 ? '（変更なし）' : ''}`);
  }
}

// 上のフォルダ以外で、まだコミットしていないファイル（公開ページの手直しなど）を「未コミット/」へ同じ道順でコピーする。
// コミットすれば GitHub から戻せるので、ここは手元にしかない分だけ。
const st = spawnSync('git', ['-c', 'core.quotepath=false', 'status', '--porcelain', '-z', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' });
if (st.status !== 0) {
  failed = true;
  console.log('× 未コミットのファイルを調べられなかった（git status）');
} else {
  const parts = st.stdout.split('\0').filter(Boolean);
  let n = 0, big = 0;
  for (let i = 0; i < parts.length; i++) {
    const code = parts[i].slice(0, 2), rel = parts[i].slice(3);
    if (/^[RC]/.test(code)) i++;                       // 改名・複写は次の要素が元の名前
    if (code.includes('D')) continue;                  // 消したファイルは控えない
    if (DIRS.some(d => rel === d || rel.startsWith(d + '/'))) continue;
    const src = path.join(ROOT, rel);
    let s; try { s = fs.statSync(src); } catch { continue; }
    if (!s.isFile()) continue;
    if (s.size > 20 * 1024 * 1024) { big++; continue; } // 大きなPDF等は取り直せるので除く
    const dst = path.join(DEST, '未コミット', rel);
    try {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
      n++;
    } catch (e) { failed = true; console.log(`× ${rel} のコピーに失敗（${e.code || e.message}）`); }
  }
  console.log(`○ 未コミットのファイル ${n}件 → ${path.join(DEST, '未コミット')}${big ? `（20MB超の${big}件は除いた）` : ''}`);
}
process.exit(failed ? 1 : 0);
