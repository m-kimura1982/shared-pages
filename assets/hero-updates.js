/* ============================================================
   hero-updates.js — トップの見出し直下に「最新の更新」を1行出す

   毎週見に来る人の目的は「先週から何が増えたか」だが、更新情報は
   トップの3画面目にあって、そこまで下りる人しか気づけなかった。

   内容は index.html の更新情報リスト（.updates-list）から読む。
   新しい更新を足すときは今までどおりリストに1件足すだけでよく、
   ここを触る必要はない。

   ・最新の1件が30日より前なら、バー自体を出さない（古い更新を
     「最近の更新」として見せない）。
   ============================================================ */
(function () {
  'use strict';

  var RECENT_DAYS = 30;

  var STYLE = [
    '.hu-bar {',
    '  max-width:900px; margin:22px auto 0;',
    '  background:#ffffff; border:1px solid #c9d8ee; border-radius:100px;',
    '  padding:9px 20px;',
    '  display:flex; align-items:center; gap:12px; flex-wrap:wrap;',
    '  text-align:left;',
    '}',
    '.hu-tag {',
    '  flex-shrink:0; font-size:11px; font-weight:700; letter-spacing:.06em;',
    '  color:#ffffff; background:#1e5fa8; border-radius:3px; padding:2px 8px;',
    '}',
    '.hu-date { flex-shrink:0; font-size:12px; font-weight:700; color:#5e6470; font-variant-numeric:tabular-nums; }',
    '.hu-title {',
    '  font-size:14px; font-weight:700; color:#222222; text-decoration:none;',
    '  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; flex:1;',
    '}',
    '.hu-title:hover { color:#1e5fa8; text-decoration:underline; }',
    '.hu-more {',
    '  flex-shrink:0; font-size:12px; font-weight:700; color:#1e5fa8; text-decoration:none;',
    '  white-space:nowrap;',
    '}',
    '.hu-more:hover { text-decoration:underline; }',
    '@media (max-width:640px) {',
    '  .hu-bar { border-radius:12px; padding:10px 14px; gap:8px; margin-top:18px; }',
    /* 1行目に NEW・日付・更新履歴、2行目に見出し。3行に散らさない */
    '  .hu-more { order:2; margin-left:auto; font-size:11.5px; }',
    '  .hu-title { order:3; flex:1 1 100%; white-space:normal; font-size:13px; }',
    '}',
    '@media print { .hu-bar { display:none; } }'
  ].join('\n');

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  /** 「8/20」→ Date。年は書いていないので、先の日付になったら前年とみなす */
  function parseMD(text) {
    var m = String(text).match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
    if (!m) return null;
    var today = new Date();
    var d = new Date(today.getFullYear(), Number(m[1]) - 1, Number(m[2]));
    if (d - today > 45 * 86400000) d.setFullYear(d.getFullYear() - 1);
    return d;
  }

  ready(function () {
    var hero = document.querySelector('.hero .hero-inner');
    var list = document.querySelector('.updates-list');
    if (!hero || !list || document.querySelector('.hu-bar')) return;

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var items = [];
    Array.prototype.forEach.call(list.querySelectorAll('li'), function (li) {
      var link = li.querySelector('.update-name');
      var dateEl = li.querySelector('.update-date');
      if (!link || !dateEl) return;
      var d = parseMD(dateEl.textContent);
      if (!d) return;
      items.push({
        date: d,
        days: Math.floor((today - d) / 86400000),
        label: dateEl.textContent.trim(),
        title: link.textContent.replace(/\s+/g, ' ').trim(),
        href: link.getAttribute('href')
      });
    });
    if (!items.length) return;

    items.sort(function (a, b) { return b.date - a.date; });
    var newest = items[0];
    if (newest.days > RECENT_DAYS) return;   // しばらく更新がないときは出さない

    var style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);

    var bar = document.createElement('div');
    bar.className = 'hu-bar';

    // 「NEW」だけでは何の帯か分からないので、更新情報だと分かる語にする
    var tag = document.createElement('span');
    tag.className = 'hu-tag';
    tag.textContent = '更新';

    var date = document.createElement('span');
    date.className = 'hu-date';
    date.textContent = newest.label;

    var title = document.createElement('a');
    title.className = 'hu-title';
    title.href = newest.href;
    title.textContent = newest.title;

    // 「ほか4件 ›」だと何の4件でどこへ行くのか分からないので、
    // ページ下部と同じ「すべての更新履歴」で揃える
    var more = document.createElement('a');
    more.className = 'hu-more';
    more.href = 'updates.html';
    more.textContent = 'すべての更新履歴 ›';

    bar.appendChild(tag);
    bar.appendChild(date);
    bar.appendChild(title);
    bar.appendChild(more);
    hero.appendChild(bar);
  });
})();
