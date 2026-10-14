// private/ と draft/ を、このPCのデスクトップの予備フォルダへコピーする。
// どちらも USB の上にしかない（private/ は git に入らず、draft/ はコミットを指示したときだけ入る）ので、USB が壊れたときの控え。
// 上書きと追加だけで、USB 側で消したファイルは予備から消さない（間違えて消したときに戻せるように）。
// 平日19時の定期実行（厚労省チェック）の最初に回す。手で回してもよい。
//
//   node tools-internal/backup-private.js
//   node tools-internal/backup-private.js "C:/別の/コピー先"
'use strict';
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DEST = process.argv[2] || path.join(os.homedir(), 'Desktop', 'サイトデータ予備R8.8.2');
const DIRS = ['private', 'draft'];

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
process.exit(failed ? 1 : 0);
