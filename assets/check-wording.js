#!/usr/bin/env node
/**
 * check-wording.js
 *
 * 確定した言葉遣いルール（assets/wording-rules.json）に反する語を、公開ページから機械的に洗い出す。
 * 直しはしない。人が読んで判断する前提の「見つける係」。
 *
 * 使い方：
 *   node assets/check-wording.js                 … 公開ページ全部を見る
 *   node assets/check-wording.js ナレッジ/調剤報酬QA.html   … ファイル指定
 *   node assets/check-wording.js --ng             … level:ng だけ表示（check は出さない）
 *
 * 見ないところ：
 *   HTMLコメント / <style> / <script> / 通知の原文引用 / 質問文 / 患者・医師へのセリフ例
 *   （原文と現場の質問はそのまま載せるのが正しいので、直す対象にしない）
 *
 * ルールを足すとき：
 *   wording-rules.json に1行足すだけ。理由や判断の経緯は private/推敲対照集.md に書く。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RULES = JSON.parse(fs.readFileSync(path.join(__dirname, 'wording-rules.json'), 'utf8')).rules;
const NG_ONLY = process.argv.includes('--ng');

// 公開ページの置き場（draft/ と private/ は見ない）
const PUBLIC_DIRS = ['加算まとめ', 'チェックリスト', '改定資料', 'ツール', 'ナレッジ', 'yakureki', '事務'];
// updates.html は過去の更新履歴。当時の書き方のまま残すので見ない
const ROOT_PAGES = ['index.html', '加算まとめ.html', 'checklists.html',
  'kaitei2026.html', 'tools.html', 'knowledge.html', '事務スタッフ向け.html'];

// 通知・告示をそのまま載せているページ。全体が原文なので見ない
const ORIG_PAGES = [
  '改定資料/別添3_調剤報酬点数表に関する事項2026.html',
  '改定資料/別表第三_調剤報酬点数表2026.html',
  '改定資料/別表Ⅰ_調剤報酬明細書摘要欄記載事項2026.html',
  '改定資料/別表Ⅴ_調剤行為名称等の略号一覧2026改定.html',
  '改定資料/疑義解釈まとめ2026.html',
  'ツール/gigi-search.html',
];

// 原文・質問文・セリフ例・出典の行。ここは直す対象にしない
const SKIP_LINE = /class="(patient-say|qtext|qa-head|reg-body|reg-item|oh|oi|gi-q|quote|orig)[ "]|より引用|出典[：:]/;
// 「…」だけで出来ている行はセリフ例とみなす
const SPEECH_LINE = /^[^「]*「[^」]{10,}」[^」]*$/;

function targets() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  if (args.length) return args.map(a => a.replace(/\\/g, '/'));
  const list = [];
  for (const p of ROOT_PAGES) if (fs.existsSync(path.join(ROOT, p))) list.push(p);
  for (const dir of PUBLIC_DIRS) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs)) if (f.endsWith('.html')) list.push(dir + '/' + f);
  }
  return list;
}

/** 原文カード・コメント・style・script を空白で潰す（行番号を保つため改行は残す） */
function mask(html) {
  return html.replace(/<details class="fold[\s\S]*?<\/details>|<!--[\s\S]*?-->|<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g,
    m => m.replace(/[^\n]/g, ' '));
}

/** タグを外して地の文だけにする */
function textOf(line) {
  return line.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ');
}

let totalNg = 0, totalCheck = 0;
const report = [];

for (const rel of targets()) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { console.log(`  ? 見つからない: ${rel}`); continue; }
  if (ORIG_PAGES.includes(rel)) continue;
  const raw = fs.readFileSync(abs, 'utf8');
  const lines = mask(raw).split('\n');
  const hits = [];

  lines.forEach((line, i) => {
    if (SKIP_LINE.test(line)) return;
    const text = textOf(line).trim();
    if (!text) return;
    const isSpeech = SPEECH_LINE.test(text);

    for (const r of RULES) {
      if (NG_ONLY && r.level !== 'ng') continue;
      if (r.skipSpeech && isSpeech) continue;
      // ページ内で正式名を併記済みなら見逃す（初出だけを問題にするルール用）
      if (r.okIfPageHas && raw.includes(r.okIfPageHas)) continue;
      if (r.skipFiles && r.skipFiles.includes(rel)) continue;
      // フォルダ単位で見逃す（そのカテゴリ全体では正しい用法になる語 用）
      if (r.skipDirs && r.skipDirs.some(d => rel.startsWith(d))) continue;
      const m = text.match(new RegExp(r.pattern));
      if (!m) continue;
      hits.push({ line: i + 1, word: m[0].trim(), rule: r, text });
      if (r.level === 'ng') totalNg++; else totalCheck++;
    }
  });

  if (hits.length) report.push({ rel, hits });
}

for (const { rel, hits } of report) {
  console.log(`\n■ ${rel}`);
  for (const h of hits) {
    const tag = h.rule.level === 'ng' ? '要修正' : '確認  ';
    const snip = h.text.length > 60 ? h.text.slice(0, 60) + '…' : h.text;
    console.log(`  ${tag} ${rel}:${h.line}  「${h.word}」→ ${h.rule.suggest}`);
    console.log(`         ${h.rule.why}`);
    console.log(`         ${snip}`);
  }
}

console.log(`\n要修正 ${totalNg}件 / 確認 ${totalCheck}件（${targets().length}ページ・${RULES.length}ルール）`);
if (!totalNg && !totalCheck) console.log('ルール違反は見つからなかった。');
process.exit(0);
