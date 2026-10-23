/* 疾患ページの行き来（先頭の切り替えバー＋末尾の「続けて読む」）と、入口の一覧
   ページを足すときは PAGES に1行足すだけでよい。並び順が「前へ／次へ」の順になる（同じ疾患の中だけ）。
   desc はページの説明の正本。入口（index.html）の一覧も末尾の「続けて読む」もここから作るので、
   ほかの場所に説明文を書かない。
   related は別の疾患のページで、つながりがあるもの（why にどこでつながるかを書く）。
   各ページは <body> の先頭で <script src="shikkan-nav.js" defer></script> を読み、
   先頭に空の <div class="sibs"></div> を置く（中身はここで作る）。
   ついでに table.stack の各セルに列の見出し（data-label）を写す（スマホで1行ずつ積むため。shikkan.css）。 */
(function () {
  var PAGES = [
    { file: '心房細動.html', dz: '心房細動', label: '総論',
      desc: '病型、抗凝固するかどうか（CHADS2）、レートとリズム',
      related: [
        { file: '冠動脈疾患_抗血栓療法.html', why: 'ステント後で抗血小板薬も飲んでいるとき' },
        { file: '弁膜症.html', why: '弁膜症性・機械弁でワルファリンになるとき' },
        { file: '心不全.html', why: '心不全を合併しているとき' } ] },
    { file: '心房細動_抗凝固薬の用量.html', dz: '心房細動', label: '用量を決める',
      desc: 'CCrの分岐点、4剤の減量基準、INRの目標、高齢・高出血リスク',
      related: [
        { file: '冠動脈疾患_抗血栓療法.html', why: '抗血小板薬との併用期間（PCI後）' },
        { file: '弁膜症.html', why: '機械弁のINR目標' } ] },
    { file: '心房細動_抗凝固薬の注意点.html', dz: '心房細動', label: '渡すときに見ること',
      desc: '併用禁忌、飲み忘れ・一包化、出血リスク、採血の間隔、中和薬',
      related: [
        { file: '冠動脈疾患_抗血栓療法.html', why: '手術・処置のときの休薬、3剤併用' },
        { file: '弁膜症.html', why: '抜歯とワルファリン' } ] },

    { file: '心不全.html', dz: '心不全', label: '総論',
      desc: 'ステージとLVEF、治療の全体像、処方を疾患の切り口で読む',
      related: [
        { file: '心房細動.html', why: '心房細動を合併しているとき' } ] },
    { file: '心不全_薬物療法.html', dz: '心不全', label: '薬物療法',
      desc: '4本柱の用量と増やし方、上乗せの薬、使わない薬、HFpEF、腎機能',
      related: [
        { file: '心房細動.html', why: 'ベラパミル・ジルチアゼムが出ているとき' },
        { file: '冠動脈疾患.html', why: '原因が虚血性心疾患のとき' } ] },
    { file: '心不全_うっ血と利尿薬.html', dz: '心不全', label: 'うっ血と利尿薬',
      desc: '体重の見方、利尿薬の使い分け、電解質、水分と塩分、退院直後',
      related: [] },
    { file: '心不全_渡すときに見ること.html', dz: '心不全', label: '渡すときに見ること',
      desc: '増悪のサイン、見るところが変わる薬、併存症、生活で言えること',
      related: [
        { file: '心房細動.html', why: '心房細動を合併しているとき（使えない薬・レートとリズム）' },
        { file: '心房細動_抗凝固薬の注意点.html', why: '抗凝固薬も飲んでいるとき' },
        { file: '糖尿病_薬物療法.html', why: '糖尿病を合併しているとき（選び方・心不全で避ける薬）' } ] },

    { file: '冠動脈疾患.html', dz: '冠動脈疾患', label: '総論',
      desc: '狭心症とACS、症状の薬と予防の薬、胸痛のない心筋梗塞、ニトロ',
      related: [
        { file: '心不全_薬物療法.html', why: '心筋梗塞のあと心不全になったとき' },
        { file: '心房細動.html', why: '心房細動を合併しているとき' } ] },
    { file: '冠動脈疾患_抗血栓療法.html', dz: '冠動脈疾患', label: '抗血栓療法',
      desc: 'DAPTの期間、単剤への移行、心房細動を合併したとき、休薬',
      related: [
        { file: '心房細動_抗凝固薬の用量.html', why: 'DOACの用量' },
        { file: '心房細動_抗凝固薬の注意点.html', why: 'DOACの併用禁忌・飲み忘れ' },
        { file: '弁膜症.html', why: '機械弁のワルファリン' } ] },

    { file: '弁膜症.html', dz: '弁膜症', label: '総論',
      desc: '狭窄と逆流、薬の役目、人工弁の抗血栓療法、抜歯とワルファリン',
      related: [
        { file: '心房細動.html', why: '弁膜症性の心房細動' },
        { file: '冠動脈疾患_抗血栓療法.html', why: '抗血小板薬も飲んでいるとき' },
        { file: '心不全.html', why: '弁膜症から心不全になったとき' } ] },
    { file: '弁膜症_感染性心内膜炎の予防.html', dz: '弁膜症', label: '感染性心内膜炎の予防',
      desc: '対象と処置、アモキシシリン2g単回、経口セフェム、発熱したとき',
      related: [] },

    { file: '糖尿病.html', dz: '糖尿病', label: '総論',
      desc: '合併症とレガシー効果、インスリン依存状態、HbA1cの目標と高齢者の下限、処方を3つに分けて読む',
      related: [
        { file: '心不全.html', why: 'SGLT2阻害薬が心不全の薬として処方されているとき' },
        { file: '冠動脈疾患.html', why: '心筋梗塞・狭心症を合併しているとき' } ] },
    { file: '糖尿病_薬物療法.html', dz: '糖尿病', label: '薬物療法',
      desc: '選び方の4段、10系統の性格、低血糖を起こす組み合わせ、eGFRで変わる扱い、併用しない組み合わせ',
      related: [
        { file: '心不全_薬物療法.html', why: 'SGLT2阻害薬（心不全の4本柱）' },
        { file: '心不全_渡すときに見ること.html', why: '心不全で禁忌・注意になる糖尿病の薬' } ] },
    { file: '糖尿病_インスリンと注射薬.html', dz: '糖尿病', label: 'インスリンと注射薬',
      desc: '絶対的適応、基礎と追加、BOTから強化療法への段階、しこりと単位、GLP-1の注射',
      related: [] },
    { file: '糖尿病_渡すときに見ること.html', dz: '糖尿病', label: '渡すときに見ること',
      desc: '低血糖を起こしやすい人、運転、シックデイの薬ごとの扱い、HbA1cのずれ、血糖を動かす併用薬、高齢者',
      related: [
        { file: '心不全_渡すときに見ること.html', why: '心不全があると見るところが変わる薬' } ] }
  ];

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  // table.stack：列の見出しを各セルへ写す
  function labelStacks() {
    var tables = document.querySelectorAll('table.stack');
    for (var t = 0; t < tables.length; t++) {
      var ths = tables[t].querySelectorAll('thead th'), names = [];
      for (var i = 0; i < ths.length; i++) names.push(ths[i].textContent.replace(/s+/g, ''));
      var rows = tables[t].querySelectorAll('tbody tr');
      for (var r = 0; r < rows.length; r++) {
        var col = 0, tds = rows[r].children;
        for (var c = 0; c < tds.length; c++) {
          if (names[col] && !tds[c].hasAttribute('data-label')) tds[c].setAttribute('data-label', names[col]);
          col += tds[c].colSpan || 1;
        }
      }
    }
  }

  // 入口（index.html）：疾患ごとの枠を PAGES から作る
  function buildIndex(grid) {
    var h = '', cur = null;
    PAGES.forEach(function (p) {
      if (p.dz !== cur) { if (cur) h += '</section>'; cur = p.dz; h += '<section class="dz"><div class="dz-name">' + esc(p.dz) + '</div>'; }
      h += '<a class="dz-row" href="' + encodeURI(p.file) + '"><span class="t">' + esc(p.label) + '</span><span class="d">' + esc(p.desc) + '</span></a>';
    });
    if (cur) h += '</section>';
    grid.innerHTML = h;
  }

  var here = decodeURIComponent(location.pathname.split('/').pop());
  if (here && !/\.html$/.test(here)) here += '.html';   // 拡張子を省くサーバーでも動くように
  var idx = -1;
  for (var i = 0; i < PAGES.length; i++) if (PAGES[i].file === here) idx = i;
  if (idx < 0) {
    var startIndex = function () { labelStacks(); var g = document.getElementById('dz-grid'); if (g) buildIndex(g); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startIndex); else startIndex();
    return;
  }
  var me = PAGES[idx];

  function find(file) { for (var i = 0; i < PAGES.length; i++) if (PAGES[i].file === file) return PAGES[i]; return null; }
  function fullName(p) { return p.label === '総論' ? p.dz + '（総論）' : p.dz + '｜' + p.label; }
  var sibs = PAGES.filter(function (p) { return p.dz === me.dz; });

  function run() {
    labelStacks();
    // 先頭の切り替えバー（同じ疾患のページ）
    var bar = document.querySelector('.sibs');
    if (bar) {
      var h = '<a class="home" href="index.html">疾患の勉強メモ</a><span class="sep">›</span><span class="lab">' + esc(me.dz) + '</span>';
      sibs.forEach(function (p) {
        h += p === me ? '<span class="on">' + esc(p.label) + '</span>'
                      : '<a href="' + encodeURI(p.file) + '">' + esc(p.label) + '</a>';
      });
      bar.innerHTML = h;
    }

    // 末尾の「続けて読む」
    var page = document.querySelector('.page');
    if (!page) return;
    // 前へ／次へは同じ疾患の中だけ（疾患をまたぐと勉強の流れとして意味がないため）
    var prev = PAGES[idx - 1], next = PAGES[idx + 1];
    if (prev && prev.dz !== me.dz) prev = null;
    if (next && next.dz !== me.dz) next = null;
    var h2 = '<div class="card-title">続けて読む</div>';

    if (prev || next) h2 += '<div class="dn-pn">';
    h2 += prev ? '<a class="dn-prev" href="' + encodeURI(prev.file) + '"><span class="k">← 前へ</span><span class="t">' + esc(fullName(prev)) + '</span></a>' : '<span></span>';
    h2 += next ? '<a class="dn-next" href="' + encodeURI(next.file) + '"><span class="k">次へ →</span><span class="t">' + esc(fullName(next)) + '</span><span class="d">' + esc(next.desc) + '</span></a>' : '<span></span>';
    if (prev || next) h2 += '</div>';

    if (sibs.length > 1) {
      h2 += '<div class="dn-h">' + esc(me.dz) + 'のページ</div><div class="dn-list">';
      sibs.forEach(function (p) {
        h2 += p === me
          ? '<div class="dn-row on"><span class="t">' + esc(p.label) + '（このページ）</span></div>'
          : '<a class="dn-row" href="' + encodeURI(p.file) + '"><span class="t">' + esc(p.label) + '</span><span class="d">' + esc(p.desc) + '</span></a>';
      });
      h2 += '</div>';
    }

    if (me.related && me.related.length) {
      h2 += '<div class="dn-h">ほかの疾患でつながるページ</div><div class="dn-list">';
      me.related.forEach(function (r) {
        var p = find(r.file); if (!p) return;
        h2 += '<a class="dn-row" href="' + encodeURI(p.file) + '"><span class="t">' + esc(fullName(p)) + '</span><span class="d">' + esc(r.why) + '</span></a>';
      });
      h2 += '</div>';
    }

    h2 += '<div class="dn-home"><a href="index.html">疾患の勉強メモ（一覧）へ</a></div>';

    var card = document.createElement('div');
    card.className = 'card dz-nav';
    card.setAttribute('data-toc', 'skip');
    card.innerHTML = h2;
    page.appendChild(card);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
