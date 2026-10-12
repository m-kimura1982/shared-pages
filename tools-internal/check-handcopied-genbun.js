#!/usr/bin/env node
/**
 * check-handcopied-genbun.js
 *
 * 加算ページの「原文を見る」のうち、build-genbun.js のマーカーを使わず手で書き写した部分を、
 * 正本（改定資料/ の告示・通知・施設基準・摘要欄・記載要領・疑義解釈まとめ）と一字ずつ突き合わせる。
 * 直しはしない。
 *
 *   node tools-internal/check-handcopied-genbun.js            公開ページ全部
 *   node tools-internal/check-handcopied-genbun.js 加算まとめ/乳幼児服薬指導加算.html
 *   --full を付けると、書き写した文と正本の文を並べて出す
 *
 * ・食い違い … 正本に似た文があるのに一字一致しない（書き写しの脱落・誤字）。差分を出す
 * ・正本にない … 似た文も見つからない（介護の告示など、正本の外の資料かもしれない）
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIRS = ['加算まとめ', 'チェックリスト', '改定資料', 'ツール', 'ナレッジ', '事務', 'yakureki'];
const SOURCES = [
  '改定資料/別表第三_調剤報酬点数表2026.html',
  '改定資料/別添3_調剤報酬点数表に関する事項2026.html',
  '改定資料/特掲診療料_施設基準届出_調剤関係2026.html',
  '改定資料/別表Ⅰ_調剤報酬明細書摘要欄記載事項2026.html',
  '改定資料/記載要領_調剤報酬請求書及び明細書2026.html',
  '改定資料/疑義解釈まとめ2026.html',
];

const plain = (html) => html
  .replace(/<!--[\s\S]*?-->/g, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/[\s　]+/g, '')
  .replace(/（/g, '(').replace(/）/g, ')')            // 全角・半角のかっこの違いは見ない
  .replace(/([０-９])/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
// 表の見出し（区分・点数）は本文ではないので除く
const CORPUS = SOURCES.map(f => plain(fs.readFileSync(path.join(ROOT, f), 'utf8'))).join('\n')
  .replace(/(加算)?区分点数/g, '');

function targets() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  if (args.length) return args.map(a => a.replace(/\\/g, '/'));
  const list = [];
  for (const dir of PUBLIC_DIRS) {
    for (const f of fs.readdirSync(path.join(ROOT, dir))) {
      const rel = dir + '/' + f;
      if (f.endsWith('.html') && !SOURCES.includes(rel)) list.push(rel);
    }
  }
  return list;
}

/** 書き写した文に一番近い正本の区間を探す（先頭・末尾の数文字を手がかりにする） */
function nearest(t) {
  let best = null;
  for (const k of [12, 8, 6]) {
    for (const anchor of [t.slice(0, k), t.slice(-k)]) {
      let i = CORPUS.indexOf(anchor);
      while (i !== -1) {
        const fromHead = anchor === t.slice(0, k);
        const start = fromHead ? i : Math.max(0, i + k - t.length - 40);
        const seg = CORPUS.slice(start, start + t.length + 40);
        const score = lcs(t, seg);
        if (!best || score > best.score) best = { seg, score };
        i = CORPUS.indexOf(anchor, i + 1);
      }
    }
    if (best && best.score > t.length * 0.6) break;
  }
  return best && best.score > t.length * 0.6 ? best.seg : null;
}

function lcsTable(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  return dp;
}
const lcs = (a, b) => lcsTable(a, b)[0][0];

/** 書き写し(a)と正本(b)の差分。正本の末尾の余りは捨てる */
function diff(a, b) {
  const dp = lcsTable(a, b);
  let i = 0, j = 0; const miss = [], extra = [];
  let m = '', e = '';
  const flush = () => { if (m) miss.push(m); if (e) extra.push(e); m = ''; e = ''; };
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { flush(); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { e += a[i++]; }
    else { m += b[j++]; }
  }
  if (i < a.length) e += a.slice(i);
  flush();
  return { miss, extra };
}

const VERBOSE = process.argv.includes('--full');
// 介護報酬の告示・通知を載せているページ。正本（調剤報酬）の外なので照合できない
const KAIGO_PAGES = ['加算まとめ/居宅療養管理指導費.html'];
let bad = 0, none = 0, pages = 0;
for (const rel of targets()) {
  const html = fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/<!-- genbun[\s\S]*?<!-- \/genbun -->/g, '');
  if (KAIGO_PAGES.includes(rel)) continue;
  const items = [...html.matchAll(/<div class="oi">([\s\S]*?)<\/div>/g)]
    .filter(m => !/<span class="lab">介護<\/span>/.test(m[1]))   // 医療・介護の給付調整の通知は正本の外
    .map(m => {
    const spans = [...m[1].matchAll(/<span(?![^>]*class="lab")[^>]*>([\s\S]*?)<\/span>\s*$/g)];
    const body = spans.length ? spans[spans.length - 1][1] : m[1];
    return plain(body.replace(/<span class="lab">[\s\S]*?<\/span>/, ''));
  }).filter(t => t.length >= 15);
  if (!items.length) continue;
  pages++;
  const out = [];
  for (const t of items) {
    // 「…」で途中を省いた引用は、区切りごとに見る
    // 末尾に付けた「（○○加算）」のような出どころの注記は除く
    const body = t.replace(/\([^()]{2,20}(加算|管理料|指導料|提供料)[0-9]?\)$/, '');
    const parts = body.split(/／|…+|（略）|\(略\)/).filter(p => p.length >= 8);
    for (const p of parts) {
      if (CORPUS.includes(p)) continue;
      const seg = nearest(p);
      if (!seg) { none++; out.push(`  正本にない  ${p.slice(0, 50)}${p.length > 50 ? '…' : ''}`); continue; }
      const { miss, extra } = diff(p, seg);
      // 正本側の余り（区間を長めに取った分）が末尾だけなら一致とみなす
      const realMiss = miss.filter((s, k) => !(k === miss.length - 1 && seg.endsWith(s)));
      if (!realMiss.length && !extra.length) continue;
      bad++;
      out.push(`  食い違い    ${p.slice(0, 40)}…`);
      if (realMiss.length) out.push(`              正本にあって抜けている：${realMiss.map(s => `「${s}」`).join(' ')}`);
      if (extra.length) out.push(`              正本と違う・余分な字：${extra.map(s => `「${s}」`).join(' ')}`);
      if (VERBOSE) out.push(`              ページ：${p}`, `              正本　：${seg}`);
    }
  }
  if (out.length) console.log(`\n■ ${rel}\n${out.join('\n')}`);
}
console.log(`\n食い違い ${bad}件 / 正本にない ${none}件（手書きの原文があるページ ${pages}枚）`);
