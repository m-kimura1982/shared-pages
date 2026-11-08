#!/usr/bin/env node
/**
 * check-commit-safety.js — 公開前の検問
 *
 * このリポジトリは public。コミットの直前に、外に出してはいけないものが入っていないかを確かめ、
 * 見つかったらコミットを止める。git の pre-commit フック（tools-internal/git-hooks/pre-commit）から呼ぶ。
 * 本人の手動コミットにも Claude のコミットにも同じように効く。
 *
 * 止めるもの
 *   1. ファイル：private/・.claude の設定（settings*.json・launch.json）・*.docx・厚労省原本PDFのフォルダ
 *   2. 書き足した行の中身：
 *      - 鍵・トークン（sk-ant- / ghp_ / github_pat_ / AKIA… / 秘密鍵）
 *      - 電話番号・メールアドレス（例示の 03-1234-5678、noreply、go.jp は通す）
 *      - private/公開NG語.txt に書いた語（個人名・店舗の内部情報など。このファイル自体は公開しない）
 *
 * 誤検出で止まったとき：本人が確かめたうえで `git commit --no-verify` で通す（Claude は使わない）。
 * 誤検出が続く語は下の ALLOW に足す。
 *
 * 単体で試す：node tools-internal/check-commit-safety.js   （いまステージされている内容を見る）
 * Claude 用のフック：--claude-hook を付けると、Bash の git コマンドに --no-verify があれば止める。
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

// ── Claude Code の PreToolUse フック（--no-verify で検問をすり抜けない）
if (process.argv.includes('--claude-hook')) {
  let input = '';
  process.stdin.on('data', c => input += c).on('end', () => {
    let cmd = '';
    try { cmd = JSON.parse(input).tool_input.command || ''; } catch { process.exit(0); }
    // git commit / push 等の引数として付いたときだけ止める（メモの本文に語が出るだけなら通す）
    if (/\bgit\s+(-c\s+\S+\s+)*(commit|push|merge|rebase|am|cherry-pick)\b[^|;&\n]*(--no-verify\b|\s-n\b)/.test(cmd)) {
      process.stderr.write('【公開前の検問】--no-verify は使わない。検問で止まったなら中身を直すか、本人に確かめてもらう（本人が自分で --no-verify を付けて通す）。\n');
      process.exit(2);
    }
    if (/\bgit\s+add\b[^|;&\n]*(\s-f\b|--force\b)[^|;&\n]*\bprivate\//.test(cmd)) {
      process.stderr.write('【公開前の検問】private/ を git add -f しようとしている。private/ は公開しない。\n');
      process.exit(2);
    }
    process.exit(0);
  });
  return;
}

const git = (...args) => execFileSync('git', ['-c', 'core.quotepath=false', ...args],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 1024 * 1024 * 200 });

// ── 1. ファイル名で止める
const BLOCK_PATHS = [
  [/^private\//, 'private/ は公開しない'],
  [/^\.claude\/(settings[^/]*\.json|launch\.json)$/, '.claude の設定ファイルはコミットしない'],
  [/\.docx$/i, 'Word ファイル（社内資料の可能性）'],
  [/^files\/２０２６改定原本_9\.2追加分\//, '厚労省原本PDF（容量が大きい・取り直せる）'],
];

// ── 2. 書き足した行の中身で止める
const PATTERNS = [
  [/sk-ant-[A-Za-z0-9_-]{10,}|\bsk-[A-Za-z0-9]{32,}/, 'APIキーらしき文字列'],
  [/\bghp_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}/, 'GitHub のトークンらしき文字列'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS のキーらしき文字列'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, '秘密鍵'],
  [/(?<![\d-])0\d{1,4}-\d{1,4}-\d{4}(?![\d-])/, '電話番号らしき文字列'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[a-z]{2,}/i, 'メールアドレス'],
];
// 通してよいもの（例示・公的機関・コミット用の noreply）
const ALLOW = [
  /03-1234-5678/,
  /[A-Za-z0-9._%+-]+@users\.noreply\.github\.com/i,
  /noreply@anthropic\.com/i,
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]*\.go\.jp/i,
  /@example\.(com|jp)/i,
];

// 人名らしき「○○さん／先生／くん／ちゃん／氏」。名前そのものは載せない方針なので、敬称の付いた形を止める。
// 前の語が一般語（患者さん・主治医の先生・赤ちゃん 等）なら通す。「氏名」「様式」は対象外。
const NAME_RE = /([一-龥々ァ-ヶー]{1,4})(さん|先生|くん|ちゃん|氏(?!名))/g;
const NAME_OK = /^(患者|皆|お子|子供|子ども|家族|利用者|購入者|薬剤師|医師|主治医|担当医|処方医|歯科医|看護師|事務|店長|本人|相手|ご家族|ご本人|お客|お母|お父|奥|旦那|娘|息子|孫|先方|保護者|介護者|ケアマネ|ヘルパー|スタッフ|新人|先輩|後輩|上司|部下|赤|お兄|お姉|お医者|お嬢|坊|子|母|父|兄|姉|弟|妹|夫|妻|方|各|同|当|貴|他)$/;
function nameLike(text) {
  const hits = [];
  for (const m of text.matchAll(NAME_RE)) {
    const w = m[1];
    if ([w, w.slice(-3), w.slice(-2), w.slice(-1)].some(x => NAME_OK.test(x))) continue;
    hits.push(w[0] + '＊'.repeat(w.length - 1) + m[2]);
  }
  return hits;
}

function loadNgWords() {
  const f = path.join(ROOT, 'private', '公開NG語.txt');
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split(/\r?\n/)
    .map(s => s.replace(/#.*$/, '').trim()).filter(Boolean);
}

const staged = git('diff', '--cached', '--name-only', '--diff-filter=ACMR').split('\n').filter(Boolean);
if (!staged.length) process.exit(0);

const problems = [];
for (const f of staged) {
  for (const [re, why] of BLOCK_PATHS) if (re.test(f)) problems.push(`${f}\n    → ${why}`);
}

const ngWords = loadNgWords();
const diff = git('diff', '--cached', '-U0', '--no-color', '--diff-filter=ACMR');
let file = '';
let lineNo = 0;
for (const raw of diff.split('\n')) {
  if (raw.startsWith('+++ ')) { file = raw.replace(/^\+\+\+ (b\/)?/, ''); continue; }
  const h = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
  if (h) { lineNo = +h[1]; continue; }
  if (!raw.startsWith('+') || raw.startsWith('+++')) continue;
  const text = raw.slice(1);
  const n = lineNo++;
  // この検問スクリプト自体の正規表現・例は対象外
  if (file === 'tools-internal/check-commit-safety.js') continue;

  let scan = text;
  for (const a of ALLOW) scan = scan.replace(new RegExp(a.source, a.flags + 'g'), '');
  for (const [re, why] of PATTERNS) {
    const m = scan.match(re);
    if (m) problems.push(`${file}:${n}\n    → ${why}（${mask(m[0])}）`);
  }
  // 人名らしき形（CLAUDE.md・コマンド・内部スクリプトの説明文は対象外。公開ページと draft だけ見る）
  if (/\.(html|js|json)$/.test(file) && !file.startsWith('tools-internal/')) {
    for (const h of nameLike(text)) problems.push(`${file}:${n}\n    → 人名らしき語（${h}）。名前は載せない`);
  }
  ngWords.forEach((w, i) => {
    // 語そのものは出さない（個人名をログに残さない）。何番目の語かだけ示す
    if (text.includes(w)) problems.push(`${file}:${n}\n    → 公開NG語.txt の ${i + 1} 番目の語`);
  });
}

if (!problems.length) process.exit(0);

// 同じものを何十件も出さない
const shown = [...new Set(problems)];
process.stderr.write(
  '\n【公開前の検問】公開してはいけないものが入っている可能性があるため、コミットを止めた。\n\n' +
  shown.slice(0, 30).join('\n') +
  (shown.length > 30 ? `\n…ほか ${shown.length - 30} 件` : '') +
  '\n\n直すか、ステージから外す（git restore --staged <ファイル>）。\n' +
  '誤検出なら本人が確かめたうえで git commit --no-verify で通す。\n\n'
);
process.exit(1);

// 見つけた文字列を出力に丸ごと出さない（個人情報・鍵をログに残さない）
function mask(s) {
  if (s.length <= 4) return s[0] + '＊'.repeat(s.length - 1);
  return s.slice(0, 3) + '…' + s.slice(-2);
}
