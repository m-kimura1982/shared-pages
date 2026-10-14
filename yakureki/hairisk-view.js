// ハイリスク薬の薬効群ページ（hairisk.css を読むページ）の表示まわり。2026-10-14
// 1. 「すべて表示／記載例だけ」の切替。記載例だけにすると、共通する注意点・確認する項目・背景知識・算定対象を隠し、
//    薬のカードの見出しと「記載例をつくる」だけを並べる。選んだ表示はこの人のブラウザに覚えさせる（次に開いたときも同じ表示）。
// 2. 各「記載例をつくる」の欄の先頭に、操作の流れを1行で出す（使い方の説明を読まない人でも、使う場所で目に入るように）。
// 置き場所：ページ末尾、記載例を組み立てるスクリプトの次の行に <script src="（yakureki/ までの相対パス）hairisk-view.js"></script>
(function () {
  var KEY = 'hairisk-view';
  var root = document.documentElement;

  function load() { try { return localStorage.getItem(KEY) || 'all'; } catch (e) { return 'all'; } }
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  // 2. 操作の流れの1行
  [].slice.call(document.querySelectorAll('.mk')).forEach(function (mk) {
    if (mk.querySelector('.mk-guide')) return;
    var p = document.createElement('p');
    p.className = 'mk-guide';
    p.textContent = '場面を選ぶ → 足りない文にチェックを付け、合わない文は外す → 下の枠の文をコピー';
    mk.insertBefore(p, mk.firstChild);
  });

  // 1. 表示の切替
  var nav = document.querySelector('.hr-nav');
  if (!nav || !document.querySelector('.mk')) return;
  var box = document.createElement('div');
  box.className = 'hr-view no-print';
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', '表示の切替');
  box.innerHTML = '<span class="lab">表示</span>' +
    '<button type="button" data-v="all">すべて表示</button>' +
    '<button type="button" data-v="tpl">記載例だけ</button>';
  nav.parentNode.insertBefore(box, nav.nextSibling);

  function apply(v) {
    root.classList.toggle('hr-tpl', v === 'tpl');
    // 隠れたカードへの目次ボタンも隠す（押しても飛び先がないため）
    [].slice.call(document.querySelectorAll('.grp-chips a[href^="#"]')).forEach(function (a) {
      var t = document.getElementById(a.getAttribute('href').slice(1));
      var card = t && (t.classList.contains('card') ? t : t.closest('.card'));
      a.hidden = v === 'tpl' && !!card && !card.querySelector('.mk');
    });
    [].slice.call(box.querySelectorAll('button')).forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.v === v ? 'true' : 'false');
    });
  }
  box.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    apply(b.dataset.v);
    save(b.dataset.v);
  });
  apply(load());
})();
