/* ============================================================
   page-toc.js — 長いページのページ内目次（チップ形式）

   使い方：目次を出したい位置に空の入れ物を置き、このファイルを読み込む。
     <div id="page-toc"></div>
     <script src="../assets/page-toc.js" defer></script>

   ・見出しは .card > .card-title と details.fold > summary から自動で拾う。
     カードを足しても目次のメンテは不要。
   ・入れ物 (#page-toc) がないページでは何もしない。
   ・見出し2つ以下のページでは目次を出さない（短いページに目次は邪魔なので）。
   ・目次に載せたくないカードは、そのカードに data-toc="skip" を付ける。
   ・目次だけ別の文言にしたいときは、そのカードに data-toc-label="〇〇" を付ける
     （折りたたみの「原文を見る（告示・通知）」→ 目次では「原文」など）。
   ・チップの見た目は調剤報酬QAのカテゴリ目次と同じ。スタイルもこのファイルが注入する。

   目次を付ける目安：本文8,000字超、または見出し10枚超。
   加算ページの標準は5,000〜6,000字で、その長さなら目次はなくてよい。
   ============================================================ */
(function () {
  'use strict';

  /* どのページにも同じ文字列で出る末尾の定型カードは目次に載せない。
     ページを見分ける手がかりにならないのに、15項目のうち4〜5個を占めていた
     （検索索引の SKIP_TERMS と同じ考え方。2026-09-02）。
     「レセプト摘要欄記載事項」「薬歴記載事項」はページごとに中身が違うので残す。 */
  var SKIP_TITLES = /^(原文|原文を見る|関連する疑義解釈|関連する過去の疑義解釈|関連する社内Q&A|関連ページ|関連する社内Q＆A)/;

  var STYLE = [
    '.page-toc { display:flex; flex-wrap:wrap; gap:7px; }',
    '.page-toc a { font-size:13px; font-weight:700; color:#1e5fa8; text-decoration:none;',
    '  border:1px solid #bcd3ee; background:#ffffff; border-radius:100px; padding:5px 12px;',
    '  white-space:nowrap; max-width:100%; }',
    '.page-toc a:hover { background:#f2f7fc; }',
    /* 共通ヘッダーが sticky なので、アンカーで飛んだとき見出しが隠れないようにする */
    '.page .card, .page details.fold, section[id] { scroll-margin-top:76px; }',
    /* 目次の開閉（スマホだけ閉じる）。
       PC は open のままで取っ手を隠すので、今までのチップ表示と同じ。
       375px幅では目次チップが137〜351pxあり、服薬管理指導料（15項目）は
       本文が1行も入らなかった（2026-09-02 の計測）。 */
    /* 取っ手を隠すのは「開いているとき」だけ。閉じているのに取っ手も無い、
       という開けない状態を作らないため（幅の判定が何かの理由で外れても壊れない）。 */
    '.toc-fold[open] > .toc-more { display:none; }',
    '@media (max-width:640px) {',
    '  .page-toc { gap:6px; }',
    '  .toc-fold { border:1px solid #bcd3ee; background:#ffffff; border-radius:8px; }',
    '  .toc-fold > .toc-more, .toc-fold[open] > .toc-more {',
    '    display:flex; align-items:center; gap:8px; list-style:none; cursor:pointer;',
    '    font-size:13px; font-weight:700; color:#1e5fa8; padding:9px 13px; }',
    '  .toc-fold > .toc-more::-webkit-details-marker { display:none; }',
    '  .toc-fold > .toc-more::marker { content:""; }',
    '  .toc-fold > .toc-more::before { content:"▸"; font-size:11px; }',
    '  .toc-fold[open] > .toc-more::before { content:"▾"; }',
    '  .toc-fold > .page-toc { padding:0 11px 11px; }',
    /* 長い見出しのチップが画面幅を超えて横スクロールを起こすので、狭い画面では折り返す */
    '  .page-toc a { font-size:11.5px; padding:4px 10px; white-space:normal; border-radius:14px; }',
    '  .page .card, .page details.fold, section[id] { scroll-margin-top:64px; }',
    '}',
    '@media print { .page-toc-wrap { display:none; } }'
  ].join('\n');

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    var box = document.getElementById('page-toc');
    if (!box) return;

    var page = document.querySelector('.page') || document;
    var sections = page.querySelectorAll('.card, details.fold');

    /* カードで組んでいないページ（薬歴の一部）は <section> + .section-title を見出しにする。
       .card-title があるページの動きは変えたくないので、カードが1枚もない時だけ使う。 */
    if (!page.querySelector('.card > .card-title')) {
      var secs = [];
      Array.prototype.forEach.call(page.querySelectorAll('.section-title'), function (t) {
        var sec = t.closest('section') || t.parentElement;
        if (sec && secs.indexOf(sec) === -1) secs.push(sec);
      });
      if (secs.length) sections = secs;
    }

    var items = [];

    Array.prototype.forEach.call(sections, function (sec, i) {
      if (sec.getAttribute('data-toc') === 'skip') return;
      if (sec.closest('#page-toc')) return;

      var titleEl = sec.matches('details.fold')
        ? sec.querySelector(':scope > summary')
        : sec.querySelector(':scope > .card-title, :scope > .section-title');
      if (!titleEl) return;

      var name = sec.getAttribute('data-toc-label') || '';
      if (!name) {
        /* 見出しの先頭テキストだけ拾う（.qual や .badge の補足語は目次に載せない） */
        Array.prototype.forEach.call(titleEl.childNodes, function (n) {
          if (n.nodeType === 3) {
            name += n.textContent;
          } else if (n.nodeType === 1 && !n.classList.contains('qual') && !n.classList.contains('badge')) {
            name += n.textContent;
          }
        });
      }
      name = name.replace(/\s+/g, ' ').trim();
      if (!name) return;
      if (SKIP_TITLES.test(name)) return;

      if (!sec.id) sec.id = 'sec-toc-' + (i + 1);
      items.push({ id: sec.id, name: name });
    });

    /* 見出しが少ないページでは目次を出さない */
    if (items.length < 3) return;

    var style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);

    box.classList.add('page-toc');
    items.forEach(function (it) {
      var a = document.createElement('a');
      a.href = '#' + it.id;
      a.textContent = it.name;
      box.appendChild(a);
    });

    /* スマホでは折りたたむ。既定を open にしておくのは、
       JSが途中で止まっても今までどおりチップが全部見えるようにするため。 */
    var fold = document.createElement('details');
    fold.className = 'toc-fold';
    fold.open = true;
    fold.innerHTML = '<summary class="toc-more">このページの目次（' + items.length + '項目）</summary>';
    box.parentNode.insertBefore(fold, box);
    fold.appendChild(box);

    var mq = window.matchMedia('(max-width:640px)');
    var sync = function () {
      var want = !mq.matches;
      if (fold.open !== want) fold.open = want;
    };
    sync();
    if (mq.addEventListener) mq.addEventListener('change', sync);
    else if (mq.addListener) mq.addListener(sync);   /* 古いSafari */
    window.addEventListener('resize', sync);          /* change が来ない環境の保険 */

    /* 目次から飛んだあとは開いたままにしない（スマホ）。
       閉じておくと、戻ってきたときに本文の位置が変わらない。 */
    box.addEventListener('click', function (ev) {
      if (ev.target.tagName === 'A' && mq.matches) fold.open = false;
    });
  });
})();
