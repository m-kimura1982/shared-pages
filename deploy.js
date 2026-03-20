/**
 * GitHub Pages デプロイスクリプト
 * 使い方: node deploy.js <HTMLファイルパス> <表示名>
 * 例: node deploy.js "D:\★2026改定資料作成用\服用薬剤調整支援料２2026\服用薬剤調整支援料２_2026改定.html" "服用薬剤調整支援料２"
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const REPO_DIR = path.resolve(__dirname);

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: REPO_DIR, stdio: 'inherit', shell: true });
}

function deploy(htmlSrc, displayName) {
  const absHtmlSrc = path.resolve(htmlSrc);
  const fileName = path.basename(absHtmlSrc);
  const destPath = path.join(REPO_DIR, fileName);

  // ── 1. HTMLをリポジトリにコピー ──
  fs.copyFileSync(absHtmlSrc, destPath);
  console.log(`\nコピー完了: ${fileName}`);

  // ── 2. index.htmlに追記（未登録の場合のみ）──
  const indexPath = path.join(REPO_DIR, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  if (html.includes(`href="${fileName}"`)) {
    console.log(`index.html: 「${displayName}」はすでに登録済みです（スキップ）`);
  } else {
    const svgIcon = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;

    const newCard = `
        <a class="card" href="${fileName}">
          <div class="card-icon">${svgIcon}</div>
          <span class="card-title">${displayName}</span>
          <span class="card-arrow">›</span>
        </a>`;

    // card-list の閉じタグ直前に挿入（CRLF/LF両対応）
    html = html.replace(/      <\/div>\r?\n    <\/main>/, newCard + '\n      </div>\n    </main>');
    fs.writeFileSync(indexPath, html, 'utf8');
    console.log(`index.html: 「${displayName}」を追加しました`);
  }

  // ── 3. git add / commit / push ──
  run(`git add "${fileName}" index.html`);

  // ステージされた変更がある場合のみcommit
  const staged = execSync('git diff --cached --name-only', { cwd: REPO_DIR, shell: true }).toString().trim();
  if (staged) {
    run(`git commit -m "Add: ${displayName}"`);
  } else {
    console.log('> 変更なし（ファイルは最新）');
  }

  run(`git push`);

  const encoded = fileName.split('').map(c => encodeURIComponent(c)).join('');
  console.log(`\n✓ デプロイ完了！`);
  console.log(`URL: https://m-kimura1982.github.io/shared-pages/${fileName}`);
}

const [,, htmlSrc, displayName] = process.argv;
if (!htmlSrc || !displayName) {
  console.error('使い方: node deploy.js <HTMLファイルパス> <表示名>');
  console.error('例:     node deploy.js "D:\\★2026改定資料作成用\\xxx.html" "加算名"');
  process.exit(1);
}

try {
  deploy(htmlSrc, displayName);
} catch (err) {
  console.error('\nエラー:', err.message);
  process.exit(1);
}
