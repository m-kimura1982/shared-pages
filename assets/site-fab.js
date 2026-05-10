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
      /* 本文（max-width:1000px）の右側ガター内に配置。狭い画面では端から14px。 */
      right: max(14px, calc((100vw - 1000px) / 2 - 88px));
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
  let ticking = false;

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

  update();
})();
