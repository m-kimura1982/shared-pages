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
// 公開サブディレクトリ（存在するものだけ走査）。薬歴マニュアル昇格時は 'yakureki' がここで拾われる。
// キーは 'yakureki/ページ名.html' のようなサイトルート相対パス（/ 区切り）になる
const PUBLIC_DIRS = ['yakureki', '加算まとめ', '改定資料', 'チェックリスト', 'ツール', 'ナレッジ', '事務'];
const files = fs
  .readdirSync(ROOT)
  .filter((f) => f.endsWith('.html'));
for (const dir of PUBLIC_DIRS) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const f of fs.readdirSync(abs)) {
    if (f.endsWith('.html')) files.push(`${dir}/${f}`);
  }
}

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

// 既存の page-meta.json から手動メタ（newUntil 等）を読み込んで保持
const jsonPathExisting = path.join(__dirname, 'page-meta.json');
let existingMeta = {};
try {
  if (fs.existsSync(jsonPathExisting)) {
    existingMeta = JSON.parse(fs.readFileSync(jsonPathExisting, 'utf8'));
  }
} catch (e) {
  console.warn(`既存 page-meta.json の読み込みに失敗: ${e.message}`);
}

const meta = {};
for (const f of files) {
  try {
    // 各ファイルのコミット履歴を新しい順に取得し、bulkCommits に該当しない最新を採用
    // --follow：フォルダ移動（rename）を越えて移動前の履歴までたどる
    // （2026-07-20 のフォルダ整理で、これがないと全ページが「移動日 = 更新日」になる）
    const log = execSync(
      `git log --follow --format="%H %cs" -- "${f}"`,
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
    if (date) {
      meta[f] = { lastUpdated: date };
      // 既存の newUntil 等の手動フィールドを引き継ぐ
      const prev = existingMeta[f];
      if (prev) {
        for (const key of Object.keys(prev)) {
          if (key !== 'lastUpdated') meta[f][key] = prev[key];
        }
      }
    }
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
