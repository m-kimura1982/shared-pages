#!/usr/bin/env node
/**
 * hook-check-html.js
 *
 * Claude Code がHTMLを書き換えるたびに自動で走る検品（.claude/settings.json の PostToolUse フック）。
 * 書き換えたページだけに check-page / check-contrast / check-wording を「要修正」だけで当て、
 * 見つかったら Claude に差し戻す（終了コード2）。何もなければ黙って終わる。
 *
 * 直しはしない。書き換え自体も止めない（すでに保存された後に走る）。
 * 外したいときは .claude/settings.json の hooks を消す。
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

let input = '';
process.stdin.on('data', c => input += c).on('end', () => {
  let file;
  try { file = JSON.parse(input).tool_input.file_path; } catch { process.exit(0); }
  if (!file || !file.endsWith('.html')) process.exit(0);

  const rel = path.relative(ROOT, path.resolve(file)).replace(/\\/g, '/');
  if (rel.startsWith('..') || rel.startsWith('private/') || rel.startsWith('tools-internal/')) process.exit(0);

  const run = (script) => {
    try {
      return execFileSync(process.execPath, [path.join(ROOT, 'assets', script), rel, '--ng'],
        { cwd: ROOT, encoding: 'utf8', timeout: 20000 });
    } catch (e) { return e.stdout || ''; }
  };

  const found = [];
  for (const script of ['check-page.js', 'check-contrast.js', 'check-wording.js']) {
    const out = run(script);
    const m = out.match(/要修正\s*(\d+)件/);
    if (m && +m[1] > 0) found.push(`── ${script}\n${out.trim()}`);
  }
  if (!found.length) process.exit(0);

  process.stderr.write(`【自動検品】${rel} に「要修正」がある。直すか、意図どおりなら理由を添えて本人に伝える。\n\n${found.join('\n\n')}\n`);
  process.exit(2);
});
