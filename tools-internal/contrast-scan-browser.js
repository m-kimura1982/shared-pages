/* 文字色コントラストの実測（ブラウザで動かす版）
 *
 * assets/check-contrast.js は CSS を読んで判定するので、印刷用スタイルや
 * 初期状態で隠れている要素まで拾える代わりに、「実際に効いている色」は分からない
 * （親から受け継いだ色、後から上書きされる色、重なった背景など）。
 * こちらは本物のブラウザで描画してから getComputedStyle で測るので、そこを補える。
 * 2枚とも通しておくと漏れがない。
 *
 * ── 使い方 ────────────────────────────────
 * 1) プレビューを立てる（Claude Code なら preview_start で .claude/launch.json の
 *    shared-pages を起動。手元なら npx serve . -p 3000）
 * 2) 開いたページの javascript_tool（またはブラウザのコンソール）にこのファイルの
 *    中身をそのまま貼って実行する。全ページを iframe に読み込んで測る。
 * 3) 30ページずつに分けて呼ぶ（1回が45秒で切れるため）。
 *
 *   await __contrastInit();        // 準備（ページ一覧の取得と iframe の用意）
 *   await __contrastScan(0,30);
 *   await __contrastScan(30,60);
 *   await __contrastScan(60,90);
 *   await __contrastScan(90,999);
 *   __contrastResult()             // 結果
 *
 * 全ページを続けて読ませると npx serve が EMFILE（ファイルの開きすぎ）で落ちることが
 * ある。落ちたら preview_start で立て直して続きから測ればよい（サイト側の問題ではない）。
 *
 * 矢印・「・」などの記号は薄くてよい（CLAUDE.md）。結果を見るときは記号を除いて、
 * 「読ませる文字」だけを拾うこと。
 *
 * 判定は assets/check-contrast.js と同じ 4.5:1（24px以上、または18.66px以上の
 * 太字は 3:1）。CLAUDE.md「デザインルール → 配色と役割」を参照。
 */
window.__contrastInit = async function () {
  const meta = await fetch('/assets/page-meta.json').then((r) => r.json());
  window.__cPages = Object.keys(meta).filter((p) => p !== '404.html');
  window.__cOut = [];
  const fr = document.createElement('iframe');
  fr.style.cssText = 'position:fixed;left:-9999px;top:0;width:375px;height:812px;border:0';
  document.body.appendChild(fr);
  window.__cFrame = fr;
  return { ページ数: window.__cPages.length };
};

window.__contrastScan = async function (from, to) {
  const fr = window.__cFrame;
  const lum = (c) =>
    c
      .map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      })
      .reduce((a, v, i) => a + [0.2126, 0.7152, 0.0722][i] * v, 0);
  const parse = (s) => {
    const m = String(s).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat);
    return { c: p.slice(0, 3), a: p[3] === undefined ? 1 : p[3] };
  };
  // 文字を持ちうる要素。small を入れておく（入れ忘れて 2026-09-10 に
  // kaitei2026 の「H18〜R8年度 全7,571件」を取りこぼした）
  const SEL = 'p,li,td,th,span,div,a,summary,dt,dd,small,strong,b,em,label,button,h1,h2,h3,h4,figcaption,caption';

  for (const page of window.__cPages.slice(from, to)) {
    await new Promise((res) => {
      let done = false;
      const fin = () => { if (!done) { done = true; setTimeout(res, 120); } };
      fr.onload = fin;
      setTimeout(fin, 1800);
      fr.src = '/' + encodeURI(page);
    });
    try {
      const doc = fr.contentDocument, win = fr.contentWindow, de = doc.documentElement;
      const bgOf = (el) => {
        let n = el;
        while (n && n !== de) {
          const b = parse(win.getComputedStyle(n).backgroundColor);
          if (b && b.a > 0.5) return b.c;
          n = n.parentElement;
        }
        return [255, 255, 255];
      };
      const low = new Map();
      doc.querySelectorAll(SEL).forEach((el) => {
        // その要素が直接持つ文字だけを見る（子の文字は子で測る）
        const t = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
        if (t.replace(/[\s・･＋+\-−→←▶✓✕×※〜~｜|/／、。，．：:；;（）()「」【】<>○●◆■□★＊*…]/g, '') === '') return;
        const cs = win.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.3) return;
        const fg = parse(cs.color);
        if (!fg) return;
        const size = parseFloat(cs.fontSize), weight = parseInt(cs.fontWeight) || 400;
        const bg = bgOf(el);
        const L1 = lum(fg.c), L2 = lum(bg);
        const cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const need = size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5;
        if (cr >= need - 0.05) return;
        const key = cs.color + '|' + bg.join(',') + '|' + size;
        if (!low.has(key)) low.set(key, { 比: +cr.toFixed(2), 必要: need, px: size, 色: cs.color, 背景: 'rgb(' + bg.join(',') + ')', 例: t.slice(0, 26), 件: 0 });
        low.get(key).件++;
      });
      const over = de.scrollWidth - de.clientWidth;
      if (low.size || over > 2) {
        window.__cOut.push({ ページ: page, 横はみ出し: over > 2 ? over : 0, 低コントラスト: [...low.values()].sort((a, b) => a.比 - b.比) });
      }
    } catch (e) {
      window.__cOut.push({ ページ: page, エラー: String(e).slice(0, 60) });
    }
  }
  return window.__cOut.length;
};

window.__contrastResult = function () {
  if (window.__cFrame) window.__cFrame.remove();
  return { 調べたページ: window.__cPages.length, 問題のあるページ: window.__cOut };
};
