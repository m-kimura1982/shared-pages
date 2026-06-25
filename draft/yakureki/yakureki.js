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
