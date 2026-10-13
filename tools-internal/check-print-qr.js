// 印刷したとき、QR（site-header.js の buildPrintQr）だけで1枚目が終わってしまうページを探す。
// 本文が2枚目から始まると、QRのためだけに紙が1枚増え、QRを入れた意味もなくなる（2026-10-13 に OTC販売の掲示物と様式で発生）。
//
//   node tools-internal/check-print-qr.js                 # 公開ページ全部（数分かかる）
//   node tools-internal/check-print-qr.js ツール/選定療養費計算ツール.html
//
// しくみ：このフォルダを一時サーバーで配信し、Chrome（なければ Edge）のヘッドレス印刷で PDF にして、
// 1枚目の文字から QR の文言（「最新の内容はQRから」「○年○月○日 印刷」）を除いた残りを数える。
//   要修正 … 1枚目が QR だけ
//   確認   … 1枚目に本文が少ししかない（題名だけ等。目で見て判断）
// QR が出ないページ（sn-no-print-qr・枠を置いていないチェックリスト）は対象外として件数だけ出す。
// 掲示物・患者に見せる紙のように、そもそも QR を入れてはいけないページかどうかはこのスクリプトでは分からない。
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFile, execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const FEW = 40; // 1枚目の本文がこの文字数未満なら「確認」

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const browser = BROWSERS.find(p => fs.existsSync(p));
if (!browser) { console.error('Chrome / Edge が見つかりません'); process.exit(1); }

function listPages() {
  const args = process.argv.slice(2);
  if (args.length) return args.map(a => a.replace(/\\/g, '/'));
  const out = execSync('git -c core.quotepath=false ls-files "*.html"', { cwd: ROOT, encoding: 'utf8' });
  return out.split('\n').filter(f => f && !/^(draft|private|tools-internal|files)\//.test(f))
    .filter(f => f !== 'index.html' && f !== '404.html')
    .filter(f => {
      const p = path.join(ROOT, f);
      if (!fs.existsSync(p)) return false;
      const s = fs.readFileSync(p, 'utf8');
      return /site-header\.js/.test(s) && !/name="sn-no-print-qr"/.test(s);
    });
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

function printPdf(url, out, profile) {
  return new Promise(resolve => {
    execFile(browser, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-pdf-header-footer',
      '--user-data-dir=' + profile, '--virtual-time-budget=8000', '--print-to-pdf=' + out, url],
      { timeout: 90000 }, () => resolve(fs.existsSync(out)));
  });
}

async function pageTexts(pdfFile) {
  const pdfjs = await import(require('url').pathToFileURL(path.join(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.mjs')).href);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(pdfFile)), verbosity: 0 }).promise;
  const texts = [];
  for (let i = 1; i <= Math.min(doc.numPages, 2); i++) {
    const c = await (await doc.getPage(i)).getTextContent();
    texts.push(c.items.map(x => x.str).join(''));
  }
  return { pages: doc.numPages, texts };
}

(async () => {
  const pages = listPages();
  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'printqr-'));
  const results = [];
  let i = 0;
  async function worker(n) {
    const profile = path.join(tmp, 'profile' + n);
    while (i < pages.length) {
      const f = pages[i++];
      const out = path.join(tmp, 'p' + n + '-' + i + '.pdf');
      process.stderr.write(`\r${i}/${pages.length}`);
      if (!await printPdf(base + encodeURI(f), out, profile)) { results.push({ f, err: 'PDFにできなかった' }); continue; }
      try {
        const { pages: np, texts } = await pageTexts(out);
        const t1 = texts[0].replace(/\s/g, '');
        if (!t1.includes('最新の内容はQRから')) { results.push({ f, noqr: true }); continue; }
        const rest = t1.replace('最新の内容はQRから', '').replace(/\d{4}年\d{1,2}月\d{1,2}日印刷/, '');
        results.push({ f, np, rest: rest.length, head: rest.slice(0, 30) });
      } catch (e) { results.push({ f, err: e.message }); }
    }
  }
  await Promise.all([0, 1, 2, 3].map(worker));
  server.close();
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
  process.stderr.write('\n');

  const ng = results.filter(r => r.rest === 0);
  const few = results.filter(r => r.rest > 0 && r.rest < FEW);
  const ok = results.filter(r => r.rest >= FEW);
  const noqr = results.filter(r => r.noqr);
  const err = results.filter(r => r.err);
  console.log(`点検 ${results.length}枚（QRあり ${ng.length + few.length + ok.length}／QRなし ${noqr.length}）`);
  console.log(`\n【要修正】1枚目がQRだけ：${ng.length}件`);
  ng.forEach(r => console.log(`  ${r.f}（全${r.np}枚）`));
  console.log(`\n【確認】1枚目の本文が${FEW}字未満：${few.length}件`);
  few.forEach(r => console.log(`  ${r.f}（${r.rest}字「${r.head}」・全${r.np}枚）`));
  if (err.length) { console.log(`\n【失敗】${err.length}件`); err.forEach(r => console.log(`  ${r.f}：${r.err}`)); }
  if (!ng.length && !few.length && !err.length) console.log('\n問題なし');
})();
