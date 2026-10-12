#!/usr/bin/env node
/**
 * check-live.js ─ 公開後の確認係
 *
 * push したコミットに含まれる公開ファイル（HTML・画像・CSS・JS・PDF）が、公開URLで
 * 手元と同じ中身で返ってくるかを確かめる。GitHub Pages の反映には1〜2分かかるので、
 * 合わないものは間をおいて数回確かめ直す。
 * HTMLは、そのページが読み込む画像・CSS・JS も一緒に確かめる（画像の git add 漏れを拾う）。
 *
 *   node tools-internal/check-live.js              直前の push で送ったコミット（origin/main@{1}..origin/main）
 *   node tools-internal/check-live.js HEAD~3       指定したコミットから HEAD まで
 *   node tools-internal/check-live.js 加算まとめ/乳幼児服薬指導加算.html   ファイル指定
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://m-kimura1982.github.io/shared-pages/';
const PRIVATE = /^(draft|private|tools-internal|\.claude|files\/２０２６改定原本)/;
const EXT = /\.(html|png|jpe?g|gif|svg|webp|css|js|json|pdf)$/i;

const git = cmd => execSync(`git -c core.quotepath=false ${cmd}`, { cwd: ROOT, encoding: 'utf8' }).trim();

function changedFiles() {
  const args = process.argv.slice(2);
  if (args.some(a => EXT.test(a))) return args.map(a => a.replace(/\\/g, '/'));
  let range = args[0] ? `${args[0]}..HEAD` : 'origin/main@{1}..origin/main';
  let out;
  try { out = git(`diff --name-only --diff-filter=AM ${range}`); }
  catch { range = 'HEAD~1..HEAD'; out = git(`diff --name-only --diff-filter=AM ${range}`); }
  console.log(`対象のコミット：${range}`);
  return out.split('\n').filter(Boolean);
}

/** HTMLが読み込む同じサイト内のファイル */
function assetsOf(rel) {
  const html = fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const out = [];
  for (const m of html.matchAll(/\b(?:src|href|srcset)="([^"#?]+)/g)) {
    const u = m[1].split(/\s+/)[0];
    if (/^(https?:|\/\/|mailto:|tel:|data:|javascript:)/.test(u) || !EXT.test(u) || /\.html$/i.test(u)) continue;
    let p; try { p = decodeURIComponent(u); } catch { p = u; }
    const abs = path.resolve(path.dirname(path.join(ROOT, rel)), p);
    out.push(path.relative(ROOT, abs).replace(/\\/g, '/'));
  }
  return out;
}

const sha = buf => crypto.createHash('sha1').update(buf).digest('hex');
const urlOf = rel => BASE + rel.split('/').map(encodeURIComponent).join('/');

async function check(rel) {
  const local = path.join(ROOT, rel);
  if (!fs.existsSync(local)) return { rel, ok: false, why: '手元にファイルがない' };
  const tracked = git(`ls-files -- "${rel}"`);
  if (!tracked) return { rel, ok: false, why: 'git に入っていない（git add 漏れ。画像なら git add -f が必要）' };
  try {
    const res = await fetch(urlOf(rel) + '?nocache=' + Date.now(), { redirect: 'follow' });
    // 新しいファイルは反映まで 404 が返ることがあるので、404 も確かめ直す
    if (!res.ok) return { rel, ok: false, why: `公開URLが ${res.status}`, retry: res.status === 404 };
    const body = Buffer.from(await res.arrayBuffer());
    // 手元のファイルは改行が CRLF に変わっていることがあるので、push した中身（HEAD のもの）と比べる
    const pushed = execSync(`git cat-file blob "HEAD:${rel}"`, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
    if (sha(body) !== sha(pushed)) return { rel, ok: false, why: '公開URLの中身が手元と違う（反映待ちか、push 漏れ）', retry: true };
    return { rel, ok: true };
  } catch (e) { return { rel, ok: false, why: '取得できない：' + e.message, retry: true }; }
}

(async () => {
  const files = changedFiles().filter(f => !PRIVATE.test(f) && EXT.test(f));
  const all = new Set(files);
  for (const f of files) if (/\.html$/i.test(f) && fs.existsSync(path.join(ROOT, f))) assetsOf(f).forEach(a => all.add(a));
  const list = [...all].filter(f => !PRIVATE.test(f));
  if (!list.length) { console.log('確かめる公開ファイルがない。'); return; }
  console.log(`${list.length}ファイルを確かめる（うち変更 ${files.length}・読み込み先 ${list.length - files.length}）`);

  let pending = list, results = new Map();
  for (let round = 1; round <= 5 && pending.length; round++) {
    if (round > 1) { console.log(`  反映待ち ${pending.length}件。30秒後に確かめ直す（${round}/5）`); await new Promise(r => setTimeout(r, 30000)); }
    const rs = await Promise.all(pending.map(check));
    rs.forEach(r => results.set(r.rel, r));
    pending = rs.filter(r => !r.ok && r.retry).map(r => r.rel);
  }
  const bad = [...results.values()].filter(r => !r.ok);
  for (const r of bad) console.log(`  × ${r.rel}\n      ${r.why}\n      ${urlOf(r.rel)}`);
  console.log(bad.length ? `\n問題 ${bad.length}件 / ${results.size}ファイル` : `\nすべて公開URLで手元と同じ中身が返った（${results.size}ファイル）。`);
})();
