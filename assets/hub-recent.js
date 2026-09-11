/* ============================================================
   hub-recent.js — ハブの「最近更新した資料」（横に送るカードの帯）

   件数の多いハブ（算定項目まとめ・改定資料一覧）で、一覧の各行から
   更新日を外した代わりに、最近更新されたものだけを上にまとめて見せる。
   中身は page-meta の lastUpdated から自動で作る（手で管理しない）。
   ・30日以内に更新された資料を新しい順に最大6件。無ければ帯ごと出さない
   ・自動では流さない（読んでいる途中で動くと読めない）
   ・PCは3枚並べて矢印で送る／スマホは次の端を見せて指で送る

   置き方：帯を出したい位置に置く
   <div data-hub-recent
        data-links="#kasan-list a.tool-card"   … 対象のリンク
        data-group-title=".cat"                … 分類名（リンクの入れ物の手前、または data-group の中から探す）
        data-group=".cat-block"                … 省略可。分類ごとの入れ物
        data-name=".tool-name" data-desc=".tool-meta"></div>
   見た目は assets/hub.css の .rs。page-meta.js を先に読むこと。
   ============================================================ */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function text(el) {
    if (!el) return '';
    var c = el.cloneNode(true);
    // 件数（.n）・更新日・バッジは名前に含めない
    c.querySelectorAll('small, .n, .lu-text, .lu-pill, .badge-new, .badge-update, .badge-wip').forEach(function (x) { x.remove(); });
    return c.textContent.replace(/\s+/g, ' ').trim();
  }

  function groupTitle(a, groupSel, titleSel) {
    if (!titleSel) return '';
    var g = groupSel && a.closest(groupSel);
    if (g) return text(g.querySelector(titleSel));
    // 見出しがリンクの入れ物の手前に置かれている作り（改定資料一覧）
    var p = a.parentElement && a.parentElement.previousElementSibling;
    while (p && !p.matches(titleSel)) p = p.previousElementSibling;
    return text(p);
  }

  ready(function () {
    var slot = document.querySelector('[data-hub-recent]');
    var meta = window.__pageMeta;
    if (!slot || !meta) return;
    var root = window.SITE_ROOT || '';
    var o = slot.dataset;
    var today = new Date(); today.setHours(0, 0, 0, 0);

    var seen = {}, items = [];
    document.querySelectorAll(o.links).forEach(function (a) {
      var abs = a.href.split('#')[0].split('?')[0];
      var key = root && abs.indexOf(root) === 0 ? decodeURIComponent(abs.slice(root.length)) : null;
      var e = key && meta[key];
      if (!e || !e.lastUpdated || seen[key]) return;
      var d = new Date(e.lastUpdated + 'T00:00:00');
      if (isNaN(d) || (today - d) / 86400000 > 30) return;
      seen[key] = true;
      items.push({
        href: a.getAttribute('href'), d: d,
        isNew: !!(e.newUntil && today <= new Date(e.newUntil + 'T23:59:59')),
        name: text(o.name ? a.querySelector(o.name) : a),
        desc: o.desc ? text(a.querySelector(o.desc)) : text(a.querySelector('small')),
        group: groupTitle(a, o.group, o.groupTitle)
      });
    });
    if (!items.length) return;
    items.sort(function (x, y) { return y.d - x.d; });
    items = items.slice(0, 6);

    var sec = document.createElement('section');
    sec.className = 'rs';
    sec.setAttribute('aria-label', '最近更新した資料');
    sec.innerHTML =
      '<div class="rs-head"><span class="rs-ttl">最近更新した資料</span><span class="rs-sub">30日以内</span>' +
      '<span class="rs-nav"><button type="button" aria-label="前へ">‹</button><button type="button" aria-label="次へ">›</button></span></div>' +
      '<div class="rs-track"></div>';
    var track = sec.querySelector('.rs-track');
    items.forEach(function (it) {
      var c = document.createElement('a');
      c.className = 'rs-card';
      c.href = it.href;
      var m = document.createElement('span');
      m.className = 'rs-meta';
      if (it.isNew) m.innerHTML = '<span class="rs-new">NEW</span>';
      var date = document.createElement('span');
      date.className = 'rs-date';
      date.textContent = (it.d.getMonth() + 1) + '月' + it.d.getDate() + '日更新';
      m.appendChild(date);
      if (it.group) {
        var g = document.createElement('span');
        g.className = 'rs-group';
        g.textContent = it.group;
        m.appendChild(g);
      }
      var n = document.createElement('span');
      n.className = 'rs-name';
      n.textContent = it.name;
      c.appendChild(m);
      c.appendChild(n);
      if (it.desc) {
        var ds = document.createElement('span');
        ds.className = 'rs-desc';
        ds.textContent = it.desc;
        c.appendChild(ds);
      }
      track.appendChild(c);
    });
    slot.appendChild(sec);

    // 矢印：カード1枚ぶん送る。端では押せない。全部見えているときは矢印を出さない
    var btns = sec.querySelectorAll('.rs-nav button');
    function sync() {
      var max = track.scrollWidth - track.clientWidth - 2;
      btns[0].disabled = track.scrollLeft <= 2;
      btns[1].disabled = track.scrollLeft >= max;
      sec.querySelector('.rs-nav').style.visibility = max > 0 ? 'visible' : 'hidden';
    }
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () {
        var card = track.querySelector('.rs-card');
        track.scrollBy({ left: (card.offsetWidth + 12) * (i ? 1 : -1), behavior: 'smooth' });
      });
    });
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  });
})();
