#!/usr/bin/env node
/**
 * build-gigi-list.js
 *
 * 疑義解釈まとめ2026.html を正本として、各加算ページの「この加算の疑義解釈」ブロックを生成する。
 *
 * 使い方：
 *   node assets/build-gigi-list.js          … 生成して書き込む
 *   node assets/build-gigi-list.js --check  … 差分があるかだけ調べる（書き込まない）
 *
 * 各ページ側の準備：
 *   1. <head> に  <link rel="stylesheet" href="../assets/gigi-list.css" />
 *   2. 本文に次のマーカーを置く（sec-xxx は まとめ側のセクション id）
 *        <!-- gigi-list:sec-zanyaku -->
 *        <!-- /gigi-list -->
 *      マーカーの間はすべて自動生成に置き換わる。手書きの補足は終了マーカーの外に置くこと。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_REL = '改定資料/疑義解釈まとめ2026.html';
const SRC = path.join(ROOT, SRC_REL);
const QA_REL = 'ナレッジ/調剤報酬QA.html';
const QA_SRC = path.join(ROOT, QA_REL);
const WRITE = !process.argv.includes('--check');

// ---------- 疑義解釈まとめ を読む ----------

/** セクション id → [{id, chip, isNew, q, a, sub}] */
function parseMatome(html) {
  const sections = {};
  const secRe = /<div class="card" id="(sec-[^"]+)">([\s\S]*?)(?=\n\s*<!-- =+ |\n\s*<\/div>\s*<\/div>\s*<\/div>|$)/g;
  // セクションは「<div class="card" id="sec-..">」から次のセクションコメントまで
  const parts = html.split(/<!-- =+ .+? =+ -->/);
  for (const part of parts) {
    const m = part.match(/<div class="card" id="(sec-[^"]+)">/);
    if (!m) continue;
    const secId = m[1];
    const items = [];
    const qaRe = /<div class="qa" id="([^"]+)">([\s\S]*?)<\/details>/g;
    let qa;
    while ((qa = qaRe.exec(part))) {
      const id = qa[1];
      const body = qa[2];
      const chipM = body.match(/<span class="src-chip( new)?">([\s\S]*?)<\/span>/);
      if (!chipM) continue;
      const qM = body.match(/<span class="qtext">([\s\S]*?)<\/span>\s*\n?\s*<span class="src-chip/);
      const cM = body.match(/<span class="ctext">([\s\S]*?)<\/span>\s*\n?\s*<\/div>\s*\n?\s*<details/);
      if (!qM || !cM) continue;
      // ctext の中は <span class="marker">結論</span><span class="sub">補足</span> の形
      const inner = cM[1];
      const markerM = inner.match(/<span class="marker">([\s\S]*?)<\/span>/);
      const subM = inner.match(/<span class="sub">([\s\S]*?)<\/span>/);
      const concl = markerM
        ? markerM[1].trim()
        : inner.replace(/<span class="sub">[\s\S]*?<\/span>/, '').trim();
      items.push({
        id,
        chip: chipM[2].trim(),
        isNew: !!chipM[1],
        q: qM[1].trim().replace(/\s*\n\s*/g, ''),
        a: concl.replace(/\s*\n\s*/g, ''),
        sub: subM ? subM[1].trim().replace(/\s*\n\s*/g, '') : '',
      });
    }
    if (items.length) sections[secId] = items;
  }
  return sections;
}

/** 調剤報酬QA.html：カード id（c-xxx）→ [{id, q, a, sub}] */
function parseQaPage(html) {
  const cards = {};
  const cardRe = /<div class="card" id="(c-[^"]+)"[^>]*>([\s\S]*?)(?=\n\s*<!-- [^\n]*-->\n\s*<div class="card" id="c-|\n\s*<\/div>\n\s*<\/div>\n\s*<!-- 原文参照)/g;
  let c;
  while ((c = cardRe.exec(html))) {
    const cardId = c[1];
    const body = c[2];
    const items = [];
    const qaRe = /<div class="qa" id="(q-[^"]+)"[^>]*>([\s\S]*?)<\/details>/g;
    let qa;
    while ((qa = qaRe.exec(body))) {
      const b = qa[2];
      const qM = b.match(/<span class="qbadge">Q<\/span>\s*\n?\s*<span>([\s\S]*?)<\/span>/);
      const cM = b.match(/<span class="ctext">([\s\S]*?)<\/span>\s*\n?\s*<\/div>/);
      if (!qM || !cM) continue;
      const inner = cM[1];
      const markerM = inner.match(/<span class="marker">([\s\S]*?)<\/span>/);
      const subM = inner.match(/<span class="sub">([\s\S]*?)<\/span>/);
      const concl = markerM
        ? markerM[1].trim()
        : inner.replace(/<span class="sub">[\s\S]*?<\/span>/, '').trim();
      items.push({
        id: qa[1],
        q: qM[1].trim().replace(/\s*\n\s*/g, ''),
        a: concl.replace(/\s*\n\s*/g, ''),
        sub: subM ? subM[1].trim().replace(/\s*\n\s*/g, '') : '',
      });
    }
    if (items.length) cards[cardId] = items;
  }
  return cards;
}

// ---------- ブロックを組み立てる ----------

const KINDS = {
  gigi: {
    title: '関連する疑義解釈',
    lead: '要旨と結論のみ記載。原文は疑義解釈まとめページで確認する。',
    more: '疑義解釈まとめで原文を見る',
  },
  qa: {
    title: '関連する社内Q&amp;A',
    lead: '結論のみ記載。解説は調剤報酬Q&amp;Aで確認する。',
    more: '調剤報酬Q&amp;Aで解説を見る',
  },
};

function buildBlock(kind, items, srcHref, indent) {
  const k = KINDS[kind];
  const p = ' '.repeat(indent);
  const out = [];
  out.push(`${p}<div class="card-title">${k.title}<span class="qual">全${items.length}件</span></div>`);
  out.push(`${p}<div class="lead-note">${k.lead}</div>`);
  for (const it of items) {
    const chip = it.chip ? `<span class="gi-src${it.isNew ? ' new' : ''}">${it.chip}</span>` : '';
    const ctext = it.sub ? `${it.a}<span class="sub">${it.sub}</span>` : it.a;
    out.push('');
    out.push(`${p}<a class="gi-row" href="${srcHref}#${it.id}">`);
    out.push(`${p}  <div class="gi-q"><span class="qbadge">Q</span><span class="qtext">${it.q}</span>${chip}</div>`);
    out.push(`${p}  <div class="gi-a"><span class="alabel">A</span><span class="ctext">${ctext}</span></div>`);
    out.push(`${p}  <div class="gi-more">${k.more}<span class="chev">›</span></div>`);
    out.push(`${p}</a>`);
  }
  return out.join('\n');
}

// ---------- 対象ページを走査 ----------

const PUBLIC_DIRS = ['.', '加算まとめ', 'チェックリスト', '改定資料', 'ツール', 'ナレッジ', '事務'];

function listPages() {
  const files = [];
  for (const d of PUBLIC_DIRS) {
    const dir = path.join(ROOT, d);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.html')) files.push(path.join(dir, f));
    }
  }
  return files;
}

function relTo(file, rel) {
  return path.relative(path.dirname(file), path.join(ROOT, rel)).split(path.sep).join('/');
}

function main() {
  // 正本が CRLF で保存されていても読めるように、改行を揃えてから解析する
  const readSrc = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  const sections = parseMatome(readSrc(SRC));
  const qaCards = parseQaPage(readSrc(QA_SRC));
  const total = Object.values(sections).reduce((n, a) => n + a.length, 0);
  const qaTotal = Object.values(qaCards).reduce((n, a) => n + a.length, 0);
  console.log(`疑義解釈まとめ：${Object.keys(sections).length}セクション / ${total}件`);
  console.log(`調剤報酬Q&A：${Object.keys(qaCards).length}カテゴリ / ${qaTotal}件`);

  let changed = 0;
  let ok = 0;
  const used = new Set();

  for (const file of listPages()) {
    const orig = fs.readFileSync(file, 'utf8');
    const name = path.relative(ROOT, file).split(path.sep).join('/');
    const re = /([ \t]*)<!-- (gigi|qa)-list:([a-z-]+[^ >]*) -->\r?\n?[\s\S]*?[ \t]*<!-- \/(?:gigi|qa)-list -->/g;
    if (!re.test(orig)) continue;
    re.lastIndex = 0;

    // 生成ブロックの改行は、そのファイルの改行に合わせる。
    // LF 決め打ちで書くと、CRLF のページでは中身が同じでも毎回「差分あり」と出て、
    // 本物の差分が埋もれる（2026-09-02、調剤管理料で発見）。
    const EOL = /\r\n/.test(orig) ? '\r\n' : '\n';

    let hit = 0;
    const next = orig.replace(re, (full, indent, kind, id) => {
      const items = kind === 'gigi' ? sections[id] : qaCards[id];
      if (!items) {
        console.log(`  ! ${name} … ${kind === 'gigi' ? 'まとめ' : '調剤報酬Q&A'}に ${id} が見つからない`);
        return full;
      }
      used.add(id);
      hit += items.length;
      const src = relTo(file, kind === 'gigi' ? SRC_REL : QA_REL);
      const block = buildBlock(kind, items, src, indent.length);
      return `${indent}<!-- ${kind}-list:${id} -->\n${block}\n${indent}<!-- /${kind}-list -->`.replace(/\r?\n/g, EOL);
    });

    if (next === orig) {
      ok++;
      continue;
    }
    if (WRITE) {
      fs.writeFileSync(file, next, 'utf8');
      console.log(`  ✓ ${name} … ${hit}件を更新`);
    } else {
      console.log(`  △ ${name} … ${hit}件で差分あり`);
    }
    changed++;
  }

  console.log(`\n更新 ${changed} / 変更なし ${ok}`);
  const unused = Object.keys(sections).filter((s) => !used.has(s));
  if (unused.length) {
    console.log(`疑義解釈まとめ・ブロック未設置：${unused.map((s) => `${s}(${sections[s].length})`).join(' ')}`);
  }
  const qaUnused = Object.keys(qaCards).filter((s) => !used.has(s));
  if (qaUnused.length) {
    console.log(`調剤報酬Q&A・ブロック未設置：${qaUnused.map((s) => `${s}(${qaCards[s].length})`).join(' ')}`);
  }
}

main();
