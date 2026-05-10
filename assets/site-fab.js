/**
 * トップへ戻るFAB（自動注入）
 *
 * 全ページで右下に出る丸ボタン。
 * 一定量スクロールしたら出現、クリックでページ最上部へスムーズスクロール。
 */
(function () {
  if (document.getElementById('sf-top')) return;

  const css = `
    .sf-top {
      position: fixed;
      /* right はJSで動的に設定（本文の右端＋余白に合わせる） */
      right: 14px;
      bottom: 24px;
      height: 38px;
      padding: 0 14px 0 11px;
      border-radius: 999px;
      background: #1e5fa8;
      border: none;
      box-shadow: 0 4px 14px rgba(30, 95, 168, 0.32);
      cursor: pointer;
      display: flex; align-items: center; gap: 5px;
      color: #fff;
      font-family: "Noto Sans JP", sans-serif;
      font-size: 12px; font-weight: 700;
      letter-spacing: 0.06em;
      opacity: 0; visibility: hidden;
      transform: translateY(8px);
      transition: opacity 0.22s, transform 0.22s, visibility 0.22s, background 0.15s;
      z-index: 90;
    }
    .sf-top.sf-show {
      opacity: 1; visibility: visible; transform: translateY(0);
    }
    .sf-top:hover { background: #174a85; }
    .sf-top:active { transform: translateY(1px); }
    .sf-top svg {
      width: 14px; height: 14px;
      stroke: #fff; fill: none; stroke-width: 2.6;
      stroke-linecap: round; stroke-linejoin: round;
    }
    @media (max-width: 700px) {
      .sf-top {
        right: 14px; bottom: 14px;
        height: 36px;
        padding: 0 13px 0 10px;
        font-size: 11px;
      }
      .sf-top svg { width: 13px; height: 13px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .sf-top { transition: opacity 0.1s; transform: none !important; }
    }
    @media print {
      .sf-top { display: none !important; }
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  const btn = document.createElement('button');
  btn.id = 'sf-top';
  btn.className = 'sf-top';
  btn.setAttribute('aria-label', 'ページの先頭へ戻る');
  btn.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="6 15 12 9 18 15"/></svg><span>TOP</span>';
  document.body.appendChild(btn);

  const THRESHOLD = 400;
  const MIN_RIGHT = 14;
  const BTN_GAP = 88; // ボタン幅80px + 余白8px の見積り
  let ticking = false;

  function getContentRect() {
    // 主要コンテナを順に探す。最初に見つかったものを本文領域とみなす。
    const selectors = ['main', '.layout-outer', '.layout', '.page-shell', '.container', '.page-wrap'];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el.getBoundingClientRect();
    }
    return null;
  }

  function updatePosition() {
    const rect = getContentRect();
    let rightOffset = MIN_RIGHT;
    if (rect) {
      const gutterRight = window.innerWidth - rect.right;
      rightOffset = Math.max(MIN_RIGHT, gutterRight - BTN_GAP);
    }
    btn.style.right = rightOffset + 'px';
  }

  function update() {
    if ((window.scrollY || document.documentElement.scrollTop) > THRESHOLD) {
      btn.classList.add('sf-show');
    } else {
      btn.classList.remove('sf-show');
    }
    ticking = false;
  }

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true }
  );

  btn.addEventListener('click', () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  // リサイズに追従
  window.addEventListener('resize', updatePosition, { passive: true });

  updatePosition();
  update();
})();
