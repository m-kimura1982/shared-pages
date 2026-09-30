// OTC類似薬の分割ページ共通：日付チップ（.rev-chip）のうち、最新の日付のものを青くする。
// 本文側は data-rev="YYYY-MM-DD" と <span class="rev-chip">M/D</span> を書くだけでよい。
// 最新日はページごとではなく、5ページ共通の LATEST で決める（ページによって最新日がずれないように）。
(function () {
  var LATEST = '2026-09-30';
  var page = document.querySelector('.page');
  if (!page) return;
  [].forEach.call(page.querySelectorAll('[data-rev="' + LATEST + '"] .rev-chip, [data-rev-day="' + LATEST + '"] .rev-chip'), function (c) { c.classList.add('new'); });
  [].forEach.call(page.querySelectorAll('[data-rev="' + LATEST + '"] > .rev-chip, [data-rev="' + LATEST + '"] .card-title > .rev-chip'), function (c) { c.classList.add('new'); });
})();
