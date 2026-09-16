/* ============================================================
   correction.js — 訂正箇所の一覧（期限つきで表示）

   使い方：ページタイトルの直後に箱を置き、このファイルを読み込む。
     <div class="correction" data-until="2026-10-16" hidden>
       <div class="correction-title">9月16日に訂正した箇所</div>
       <div class="correction-wrap"><table>
         <thead><tr><th>以前の記載</th><th>正しい内容</th></tr></thead>
         <tbody>
           <tr><td>以前の文</td><td>正しい文</td></tr>
           <tr><td class="none">（記載なし）</td><td>追記した内容</td></tr>
         </tbody>
       </table></div>
     </div>
     <script src="../assets/correction.js" defer></script>

   ・更新情報の【訂正のお知らせ】は1文なので、どこがどう変わったかはページのこの表で見せる。
     訂正の前に読んだ人が、開いてすぐ気づけるようにタイトル直後に置く。
   ・data-until の日を過ぎると表示しない（手で消すと消し忘れて残るため。目安は訂正日から30日）。
     期限が過ぎたら、ついでのときに箱ごと削除してよい。
   ・hidden を付けておく。スクリプトが期限内と判定したときだけ出すので、期限切れの箱が一瞬見えることがない。
   ・見た目：以前の記載はグレーの文字、正しい内容は青の太字（料金表の現行／改定後と同じ役割）。
     赤・アンバーは使わない。取り消し線も引かない（読みにくくなるため）。
   ・印刷では出さない（訂正の告知は画面で読む人向け）。
   ============================================================ */
(function () {
  'use strict';

  var STYLE = [
    '.correction { background:#f2f2f2; border:0.5px solid #d1d5db; border-radius:6px; padding:13px 16px; font-size:var(--text-sm, 15px); }',
    '.correction-title { font-weight:900; display:flex; align-items:center; gap:9px; margin-bottom:8px; }',
    '.correction-title::before { content:""; width:9px; height:9px; border-radius:2px; background:#1e5fa8; flex-shrink:0; }',
    '.correction-wrap { overflow-x:auto; }',
    '.correction table { width:100%; min-width:0; border-collapse:collapse; font-size:inherit; background:#fff; border-radius:4px; }',
    '.correction th { background:transparent; font-weight:700; color:#444444; text-align:left; padding:6px 10px; border-bottom:1px solid #9ca3af; white-space:nowrap; font-size:var(--text-xs, 13px); }',
    '.correction td { padding:7px 10px; border-bottom:0.5px solid #d1d5db; vertical-align:top; line-height:1.7; width:50%; }',
    '.correction tr:last-child td { border-bottom:none; }',
    '.correction td:first-child { color:#5e6470; }',
    '.correction td:last-child { color:#1e5fa8; font-weight:700; }',
    '@media (max-width:640px) { .correction { padding:11px 12px; } .correction th, .correction td { padding:6px 7px; } }',
    '@media print { .correction { display:none !important; } }'
  ].join('\n');

  function run() {
    var boxes = document.querySelectorAll('.correction[data-until]');
    if (!boxes.length) return;
    var style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);
    var now = new Date();
    Array.prototype.forEach.call(boxes, function (box) {
      var until = new Date(box.getAttribute('data-until') + 'T23:59:59');
      if (isNaN(until) || now > until) { box.remove(); return; }
      box.hidden = false;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
