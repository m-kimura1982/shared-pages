/**
 * カードに「X日前 更新」バッジを自動表示
 *
 * 使い方: 各ランディングページ（kaitei2026.html / tools.html / knowledge.html）の
 *   <body> 内末尾に <script src="assets/last-updated.js" defer></script>
 *
 * page-meta.json を読み、<a class="card" href="...">に該当する更新日を見つけて
 * カード右下に「X日前 更新」を表示する。
 */
(function () {
  const meta = window.__pageMeta;
  if (!meta) {
    console.warn('window.__pageMeta が未定義。page-meta.js が読み込まれていません。');
    return;
  }

  // スタイル注入
  const style = document.createElement('style');
  // 2026-09-11：カード右下に重ねる（absolute）のをやめ、題名・説明文のまとまりの末尾に1行として並べる。
  // 重ねると説明文が長いカードで文字の上に被っていた。トップの棚カードと同じく、補助情報は本文の下に置く。
  style.textContent = `
    .lu-text, .lu-pill {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 6px;
      pointer-events: none;
    }
    .lu-text {
      font-size: 12px;
      color: #5e6470;   /* 補助テキストの基準色（白地で5.9）。#777 以下は薄すぎ */
      font-weight: 400;
      letter-spacing: 0.02em;
    }
    /* 7日以内はもう一段濃くする */
    .lu-text.lu-mid { color: #444444; font-weight: 500; }
    /* 塗りの青に小さな白文字は読みにくいので、淡い青地に青文字（2026-09-11） */
    .lu-pill .lu-pill-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      color: #1e5fa8;
      background: #e4eef9;
      padding: 1px 7px;
      border-radius: 3px;
      letter-spacing: 0.04em;
    }
    .lu-pill .lu-pill-when {
      font-size: 11.5px;
      font-weight: 700;
      color: #1e5fa8;
    }
    @media (max-width: 700px) {
      .lu-text { font-size: 11.5px; }
      .lu-pill .lu-pill-badge { font-size: 10.5px; }
      .lu-pill .lu-pill-when { font-size: 11px; }
    }
  `;
  document.head.appendChild(style);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cards = document.querySelectorAll(
    'a.card[href], a.tool-card[href], a.card-digest[href], a.hub-main[href]'
  );
  cards.forEach((card) => {
    const href = card.getAttribute('href');
    // サイトルート相対パスをキーにする（サブディレクトリ対応。site-header.js が SITE_ROOT を提供）
    let filename = null;
    if (window.SITE_ROOT) {
      try {
        const abs = new URL(href, location.href).href.split('#')[0].split('?')[0];
        if (abs.startsWith(window.SITE_ROOT)) {
          filename = decodeURIComponent(abs.slice(window.SITE_ROOT.length));
        }
      } catch (e) {}
    }
    // 保険：ルート不明時は旧来どおりファイル名だけで判定
    if (!filename) {
      filename = decodeURIComponent(href.split('/').pop().split('#')[0].split('?')[0]);
    }
    const entry = meta[filename];
    if (!entry || !entry.lastUpdated) return;

    const updated = new Date(entry.lastUpdated + 'T00:00:00');
    if (isNaN(updated.getTime())) return;
    const diffDays = Math.floor((today - updated) / (1000 * 60 * 60 * 24));

    // 91日以上前は表示しない
    if (diffDays > 90) return;

    // newUntil が設定されており今日以前 → NEW バッジを優先表示
    let isNewActive = false;
    if (entry.newUntil) {
      const newUntil = new Date(entry.newUntil + 'T23:59:59');
      if (!isNaN(newUntil.getTime()) && today <= newUntil) {
        isNewActive = true;
      }
    }

    let el;
    if (isNewActive) {
      el = document.createElement('span');
      el.className = 'lu-pill';
      el.innerHTML = `<span class="lu-pill-badge">NEW</span>`;
    } else if (diffDays <= 1) {
      // 今日 / 昨日 → ピル型バッジ + 相対表記
      const when = diffDays <= 0 ? '今日' : '昨日';
      el = document.createElement('span');
      el.className = 'lu-pill';
      el.innerHTML = `<span class="lu-pill-badge">更新</span><span class="lu-pill-when">${when}</span>`;
    } else {
      // 2日以上 → テキストのみ
      let label;
      if (diffDays <= 30) label = `${diffDays}日前更新`;
      else label = `${Math.floor(diffDays / 30)}か月前更新`;
      el = document.createElement('span');
      el.className = 'lu-text';
      if (diffDays <= 7) el.classList.add('lu-mid');
      el.textContent = label;
    }
    placeLine(card, el);
  });

  // 題名・説明文のまとまりの末尾に入れる。カードの組み方はハブごとに違う：
  //   縦積み（加算まとめ・薬歴）         … カードの末尾
  //   アイコン＋本文＋矢印の横並び       … 本文の箱（題名の親）の末尾
  //   横並びで題名がカード直下（改定資料） … 題名の中の末尾（題名の下の行になる）
  function placeLine(card, el) {
    const title = card.querySelector('.tool-name, .digest-title, .hub-title, .card-title');
    if (!title) { card.appendChild(el); return; }
    const box = title.parentElement;
    if (box !== card) { box.appendChild(el); return; }
    const cs = getComputedStyle(card);
    const row = cs.display.indexOf('flex') !== -1 && cs.flexDirection.indexOf('row') === 0;
    (row ? title : card).appendChild(el);
  }
})();
