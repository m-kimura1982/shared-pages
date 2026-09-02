/* 共通UI：表示切替（解説＋テンプレ / テンプレのみ）
   - .tpl-toggle 内の button[data-mode="tpl"|"all"] をクリックで body.tpl-only を切替
   - 選択状態は localStorage に保存し、ページ間で引き継ぐ
   - defer で読み込むこと（DOM 構築後に実行される） */
(function () {
  var toggle = document.querySelector(".tpl-toggle");
  if (!toggle) return;
  var buttons = toggle.querySelectorAll("button");

  function setMode(only) {
    document.body.classList.toggle("tpl-only", only);
    buttons.forEach(function (b) {
      b.classList.toggle("active", (b.dataset.mode === "tpl") === only);
    });
    try { localStorage.setItem("yakureki-tpl-only", only ? "1" : "0"); } catch (e) {}
  }

  toggle.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    setMode(btn.dataset.mode === "tpl");
  });

  // 復元
  try {
    if (localStorage.getItem("yakureki-tpl-only") === "1") setMode(true);
  } catch (e) {}
})();

/* 「このページの使い方」をスマホでは折りたたむ（2026-09-02 追加）
   案内カード3枚で404px（375px幅で実測）あり、本文は899px＝2画面目から
   始まっていた。毎回このページを開く人が、半画面分の案内を通過している。
   PC は開いたままで取っ手を隠すので、今までと同じ見た目。
   取っ手を隠すのは開いているときだけ（閉じているのに開けない状態を作らない）。 */
(function () {
  var guide = document.getElementById("guide");
  if (!guide) return;
  var cards = guide.querySelector(".guide-cards");
  var label = guide.querySelector(".section-label");
  if (!cards || guide.querySelector("details.guide-fold")) return;

  var css = [
    ".guide-fold[open] > .guide-more { display:none; }",
    "@media (max-width:640px) {",
    "  .guide-fold { border:1px solid var(--border); background:var(--white); border-radius:var(--radius-sm); }",
    "  .guide-fold > .guide-more, .guide-fold[open] > .guide-more {",
    "    display:flex; align-items:center; gap:8px; list-style:none; cursor:pointer;",
    "    font-size:13px; font-weight:700; color:var(--blue); padding:9px 13px; }",
    "  .guide-fold > .guide-more::-webkit-details-marker { display:none; }",
    "  .guide-fold > .guide-more::marker { content:''; }",
    "  .guide-fold > .guide-more::before { content:'▸'; font-size:11px; }",
    "  .guide-fold[open] > .guide-more::before { content:'▾'; }",
    "  .guide-fold > .guide-cards { padding:0 11px 11px; }",
    "}"
  ].join("\n");
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  var fold = document.createElement("details");
  fold.className = "guide-fold";
  fold.open = true;
  fold.innerHTML = '<summary class="guide-more">このページの使い方</summary>';
  cards.parentNode.insertBefore(fold, cards);
  fold.appendChild(cards);
  /* 見出しは summary が兼ねるので、スマホで二重にならないよう畳んだときだけ隠す */
  if (label) label.dataset.guideLabel = "1";

  var mq = window.matchMedia("(max-width:640px)");
  function sync() {
    var want = !mq.matches;
    if (fold.open !== want) fold.open = want;
    if (label) label.style.display = mq.matches ? "none" : "";
  }
  sync();
  if (mq.addEventListener) mq.addEventListener("change", sync);
  else if (mq.addListener) mq.addListener(sync);
  window.addEventListener("resize", sync);
})();
