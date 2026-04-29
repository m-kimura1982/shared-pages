/**
 * 各HTMLファイルの最終更新日を git log から取得して page-meta.json に保存
 *
 * 実行: node assets/build-page-meta.js
 *   ※ ページを更新したら手動で再実行する（または更新時にClaudeが手動でJSONを直接編集してもよい）
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const files = fs
  .readdirSync(ROOT)
  .filter((f) => f.endsWith('.html'));

// 大規模一括コミット（20ファイル以上を変更したもの）のハッシュを取得 → スキップ対象
// -c core.quotepath=false で日本語ファイル名のエスケープを無効化
const gitOpts = { cwd: ROOT, encoding: 'utf8' };
const allCommits = execSync(
  `git -c core.quotepath=false log --format="%H"`,
  gitOpts
).trim().split('\n');

const bulkCommits = new Set();
for (const hash of allCommits) {
  try {
    const out = execSync(
      `git -c core.quotepath=false show --name-only --format= ${hash}`,
      gitOpts
    ).trim().split('\n');
    const htmlCount = out.filter((s) => /\.html$/.test(s)).length;
    if (htmlCount >= 20) bulkCommits.add(hash);
  } catch (e) {}
}

const meta = {};
for (const f of files) {
  try {
    // 各ファイルのコミット履歴を新しい順に取得し、bulkCommits に該当しない最新を採用
    const log = execSync(
      `git log --format="%H %cs" -- "${f}"`,
      { cwd: ROOT, encoding: 'utf8' }
    ).trim().split('\n');

    let date = null;
    for (const line of log) {
      const [hash, d] = line.split(' ');
      if (!bulkCommits.has(hash)) {
        date = d;
        break;
      }
    }
    // 全部 bulk だった場合は最新を採用
    if (!date && log.length > 0) date = log[0].split(' ')[1];
    if (date) meta[f] = { lastUpdated: date };
  } catch (e) {
    console.warn(`skip ${f}: ${e.message}`);
  }
}

// JSON も書く（参照用）
const jsonPath = path.join(__dirname, 'page-meta.json');
fs.writeFileSync(jsonPath, JSON.stringify(meta, null, 2), 'utf8');

// JS としても書く（実行時に window.__pageMeta にセット → fetch 不要で確実）
const jsPath = path.join(__dirname, 'page-meta.js');
const jsContent = `window.__pageMeta = ${JSON.stringify(meta, null, 2)};\n`;
fs.writeFileSync(jsPath, jsContent, 'utf8');

console.log(`✓ ${Object.keys(meta).length} entries written to:\n  ${jsonPath}\n  ${jsPath}`);
