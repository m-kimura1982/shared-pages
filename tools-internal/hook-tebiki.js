#!/usr/bin/env node
/**
 * hook-tebiki.js
 *
 * HTMLを書く前に、その作業に要る手引き（.claude/手引き/）をこの会話で読んだかを確かめる
 * （.claude/settings.json の PreToolUse フック。Edit / Write / MultiEdit）。
 * 読んでいなければ書き込みを止め、どの手引きを読むかを Claude に返す（終了コード2）。
 *
 * 2026-11-17：CLAUDE.md の細則を手引きへ分けたので、読み飛ばしを人の注意に頼らず仕組みで防ぐ。
 * 言葉だけの直し（色・クラス・style を含まない Edit）は止めない。
 * 読んだかどうかは会話の記録（transcript）から Read の呼び出しを探して判断する。
 * 記録が読めないときは止めない（念押しの仕組みで、検問ではないため）。
 *
 * 手引きを足したら RULES に1行足す。
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const DIR = '.claude/手引き/';

// when(rel, text, isWrite) が真なら、その手引きを読んでいることを求める
const CSSISH = /<style|style=|class=|#[0-9a-fA-F]{3,8}\b|color\s*:|background|<details|<table|@media|var\(--/;
const RULES = [
  { file: 'デザインルール.md', why: '新しいページ・見た目（色・クラス・style・表・折りたたみ）を書く',
    when: (rel, text, isWrite) => isWrite || CSSISH.test(text) },
  { file: '薬歴マニュアル.md', why: 'yakureki/ のページを書く',
    when: (rel) => /(^|\/)yakureki\//.test(rel) },
  { file: '自動生成（原文・疑義解釈）.md', why: '原文・疑義解釈・社内Q&A のマーカーや正本を書く',
    when: (rel, text) => /<!--\s*\/?(genbun|gigi-list|qa-list|gigi-latest)/.test(text)
      || /^改定資料\/(別表第三|別添3|特掲診療料|疑義解釈まとめ)/.test(rel) },
  { file: '文章のページ別ルール.md', why: '摘要欄のページ・調剤報酬QA を書く',
    when: (rel, text) => rel === 'ナレッジ/調剤報酬QA.html' || /摘要欄|レセプト表示文言/.test(text) },
  { file: 'サイトの仕組み（検索・トップ）.md', why: 'トップページ・検索の索引を触る',
    when: (rel) => rel === 'index.html' || rel === 'ページ一覧.html' },
];

function readInSession(transcript, sessionId) {
  // 一度見つけた分は覚えておく（毎回、長い記録を読み直さない）
  const memo = path.join(os.tmpdir(), `tebiki-${String(sessionId || 'x').replace(/[^\w-]/g, '')}.json`);
  let seen = [];
  try { seen = JSON.parse(fs.readFileSync(memo, 'utf8')); } catch {}
  let text;
  try { text = fs.readFileSync(transcript, 'utf8'); } catch { return null; }   // 記録が読めない
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    if (o.type === 'tool_use' && o.name === 'Read' && o.input && typeof o.input.file_path === 'string') {
      const p = o.input.file_path.replace(/\\/g, '/');
      for (const r of RULES) if (p.endsWith('手引き/' + r.file) && !seen.includes(r.file)) seen.push(r.file);
    }
    for (const v of Array.isArray(o) ? o : Object.values(o)) walk(v);
  };
  for (const line of text.split('\n')) {
    if (!line.includes('"Read"')) continue;
    try { walk(JSON.parse(line)); } catch {}
  }
  try { fs.writeFileSync(memo, JSON.stringify(seen)); } catch {}
  return seen;
}

let input = '';
process.stdin.on('data', c => input += c).on('end', () => {
  let j;
  try { j = JSON.parse(input); } catch { process.exit(0); }
  const ti = j.tool_input || {};
  const file = ti.file_path;
  if (!file || !/\.html$/i.test(file)) process.exit(0);
  const rel = path.relative(ROOT, path.resolve(file)).replace(/\\/g, '/');
  if (rel.startsWith('..') || rel.startsWith('private/') || rel.startsWith('tools-internal/') || rel.startsWith('draft/退避/')) process.exit(0);

  const isWrite = j.tool_name === 'Write';
  const text = [ti.content, ti.new_string, ...(Array.isArray(ti.edits) ? ti.edits.map(e => e.new_string) : [])]
    .filter(s => typeof s === 'string').join('\n');

  const need = RULES.filter(r => r.when(rel, text, isWrite));
  if (!need.length) process.exit(0);

  const seen = readInSession(j.transcript_path, j.session_id);
  if (seen === null) process.exit(0);
  const missing = need.filter(r => !seen.includes(r.file));
  if (!missing.length) process.exit(0);

  process.stderr.write(
    `【手引きの確認】${rel} を書く前に、この会話でまだ読んでいない手引きがある。先に Read で読んでから、もう一度書き込む。\n`
    + missing.map(r => `- ${DIR}${r.file}（${r.why}とき）`).join('\n') + '\n');
  process.exit(2);
});
