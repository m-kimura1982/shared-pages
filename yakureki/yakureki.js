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

  /* 開閉の見た目はサイト共通の assets/fold.css（class="fold-in"）。
     PC は枠を消し、開いているときは取っ手を隠す */
  var css = [
    "details.guide-fold { border:0; background:none; border-radius:0; }",
    "details.guide-fold[open] > .guide-more { display:none; }",
    "@media (max-width:640px) {",
    "  details.guide-fold { border:1px solid var(--fold-line, #c9d3df); background:#fff; border-radius:8px; }",
    "  details.guide-fold[open] > .guide-more { display:flex; }",
    "  details.guide-fold > .guide-more { font-size:13.5px; }",
    "  details.guide-fold > .guide-cards { padding:11px 11px 12px; }",
    "}"
  ].join("\n");
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  var fold = document.createElement("details");
  fold.className = "guide-fold fold-in";
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
