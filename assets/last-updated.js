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
  style.textContent = `
    .card, .tool-card, .card-digest { position: relative; }
    .lu-text {
      position: absolute;
      bottom: 6px;
      right: 32px;
      font-size: 10.5px;
      color: #b0b0b0;
      font-weight: 400;
      letter-spacing: 0.02em;
      pointer-events: none;
    }
    .lu-text.lu-mid { color: #888; font-weight: 500; font-size: 11px; }
    .lu-pill {
      position: absolute;
      bottom: 6px;
      right: 32px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      pointer-events: none;
    }
    .lu-pill .lu-pill-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      color: #fff;
      background: #1e5fa8;
      padding: 1px 7px;
      border-radius: 3px;
      letter-spacing: 0.04em;
    }
    .lu-pill .lu-pill-when {
      font-size: 11.5px;
      font-weight: 700;
      color: #1e5fa8;
    }
    /* card-digest（横長カード）はサブタイトルと被るため右上に配置 */
    .card-digest .lu-text,
    .card-digest .lu-pill {
      bottom: auto;
      top: 8px;
      right: 32px;
    }
    @media (max-width: 700px) {
      .lu-text, .lu-pill { right: 28px; bottom: 4px; }
      .lu-text { font-size: 10px; }
      .lu-pill .lu-pill-badge { font-size: 9px; padding: 1px 6px; }
      .lu-pill .lu-pill-when { font-size: 10.5px; }
      .card-digest .lu-text,
      .card-digest .lu-pill { top: 6px; right: 28px; }
    }
  `;
  document.head.appendChild(style);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cards = document.querySelectorAll('a.card[href], a.tool-card[href], a.card-digest[href]');
  cards.forEach((card) => {
    const href = card.getAttribute('href');
    const filename = decodeURIComponent(href.split('/').pop().split('#')[0].split('?')[0]);
    const entry = meta[filename];
    if (!entry || !entry.lastUpdated) return;

    const updated = new Date(entry.lastUpdated + 'T00:00:00');
    if (isNaN(updated.getTime())) return;
    const diffDays = Math.floor((today - updated) / (1000 * 60 * 60 * 24));

    // 91日以上前は表示しない
    if (diffDays > 90) return;

    let el;
    if (diffDays <= 1) {
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
    card.appendChild(el);
  });
})();
