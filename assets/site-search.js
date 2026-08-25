/**
 * サイト内検索（軽量クライアントサイド）
 *
 * site-header.js が window.SITE_PAGES / window.SITE_CATEGORIES を公開した上で
 * このファイルを読み込む。タイトル・ファイル名・カテゴリ名を対象にした
 * 部分一致検索 + コマンドパレット風のオーバーレイUI。
 *
 * 起動：ヘッダーの検索ボタン / 「/」キー / Ctrl(Cmd)+K
 */
(function () {
  function init() {
    const PAGES = window.SITE_PAGES;
    const CATEGORIES = window.SITE_CATEGORIES;
    if (!PAGES || !CATEGORIES) return;

    // ── インデックス構築 ──
    const index = Object.entries(PAGES)
      .filter(([file]) => file !== 'index.html') // ホーム自身は除外
      .map(([file, info]) => {
        const catName = (CATEGORIES[info.category] && CATEGORIES[info.category].name) || '';
        return {
          file,
          title: info.title,
          category: info.category,
          categoryName: catName,
          baseHay: (info.title + ' ' + file + ' ' + catName).toLowerCase(),
          titleLower: info.title.toLowerCase(),
        };
      });

    // ページ内の見出し（build-search-index.js が生成）。ページ名にない言葉でも探せるようにする。
    // search-index.js の到着が遅れることがあるので、検索のたびに読み直して一度だけ組み立てる。
    let termsReady = false;
    function hydrateTerms() {
      const src = window.__searchIndex;
      if (termsReady || !src) return;
      for (const item of index) {
        const terms = src[item.file] || [];
        item.terms = terms;
        item.termsLower = terms.map((t) => t.toLowerCase());
        item.haystack = item.baseHay + ' ' + terms.join(' ').toLowerCase();
      }
      termsReady = true;
    }
    for (const item of index) {
      item.terms = [];
      item.termsLower = [];
      item.haystack = item.baseHay;
    }

    // ── CSS ──
    const css = `
      .ss-overlay {
        position: fixed; inset: 0;
        background: rgba(20, 30, 50, 0.45);
        z-index: 1000;
        display: none;
        align-items: flex-start; justify-content: center;
        padding: 80px 16px 16px;
        backdrop-filter: blur(2px);
      }
      .ss-overlay.ss-open { display: flex; }
      .ss-modal {
        background: #fff;
        width: 100%; max-width: 600px;
        border-radius: 14px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.25);
        overflow: hidden;
        display: flex; flex-direction: column;
        max-height: calc(100vh - 100px);
        font-family: "Noto Sans JP", sans-serif;
      }
      .ss-input-wrap {
        display: flex; align-items: center;
        padding: 14px 16px;
        border-bottom: 1px solid #eef0f4;
        gap: 10px;
      }
      .ss-input-wrap > svg {
        width: 18px; height: 18px;
        stroke: #1e5fa8; fill: none; stroke-width: 2;
        stroke-linecap: round; stroke-linejoin: round;
        flex-shrink: 0;
      }
      .ss-input {
        flex: 1 1 0; min-width: 0;
        border: none; outline: none;
        font-size: 16px; font-family: inherit;
        background: transparent; color: #222;
        padding: 4px 0;
      }
      .ss-input::placeholder { color: #aab0bc; }
      .ss-close {
        background: #f0f2f5; border: none;
        width: 28px; height: 28px; border-radius: 6px;
        font-size: 18px; line-height: 1;
        color: #555; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
      }
      .ss-close:hover { background: #e3e7ee; color: #222; }
      .ss-results {
        flex: 1; overflow-y: auto;
        padding: 6px;
      }
      .ss-section-label {
        font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
        color: #888; padding: 10px 12px 6px;
      }
      .ss-item {
        display: block;
        padding: 10px 12px;
        border-radius: 8px;
        text-decoration: none;
        color: #222;
        cursor: pointer;
      }
      .ss-item.ss-active,
      .ss-item:hover {
        background: #e8f0fb;
      }
      .ss-item-title {
        font-size: 14px; font-weight: 700;
        line-height: 1.5;
      }
      .ss-item-title mark {
        background: #fff3a3; color: inherit; padding: 0 1px; border-radius: 2px;
      }
      .ss-item-meta {
        font-size: 11px; color: #1e5fa8;
        font-weight: 700; margin-top: 2px;
        letter-spacing: 0.05em;
      }
      .ss-item-hit {
        color: #5e6470; font-weight: 500; margin-left: 8px;
      }
      .ss-item-hit mark { background: #fff59d; color: inherit; }
      .ss-empty-link {
        display: block; margin-top: 14px;
        color: #1e5fa8; font-weight: 700; text-decoration: none;
      }
      .ss-empty-link:hover { text-decoration: underline; }
      .ss-empty {
        padding: 32px 16px; text-align: center;
        color: #888; font-size: 13px;
      }
      .ss-hint {
        padding: 8px 14px;
        border-top: 1px solid #eef0f4;
        font-size: 11px; color: #888;
        display: flex; gap: 14px; flex-wrap: wrap;
      }
      .ss-hint kbd {
        background: #f0f2f5; border: 1px solid #d8dde8;
        border-radius: 3px; padding: 0 5px;
        font-family: inherit; font-size: 10px; font-weight: 700;
        color: #555;
      }
      /* 検索で見つからないときの逃げ道。トップを経由しない人にも届くよう常時出す */
      .ss-hint-link {
        margin-left: auto; color: #1e5fa8; font-weight: 700; text-decoration: none;
        white-space: nowrap;
      }
      .ss-hint-link:hover { text-decoration: underline; }
      @media (max-width: 600px) {
        .ss-hint-link { margin-left: 0; width: 100%; }
      }

      /* 検索ボタン（ヘッダー埋め込み用） */
      .sn-search-btn {
        background: #e8f0fb; border: 1px solid transparent;
        border-radius: 8px;
        padding: 6px 12px 6px 10px;
        cursor: pointer;
        display: flex; align-items: center; gap: 8px;
        font-family: inherit; font-size: 13px; font-weight: 700;
        color: #1e5fa8;
        transition: background 0.15s, border-color 0.15s;
      }
      .sn-search-btn:hover {
        background: #d6e4f6; border-color: #1e5fa8;
      }
      .sn-search-btn svg {
        width: 14px; height: 14px;
        stroke: currentColor; fill: none; stroke-width: 2.2;
        stroke-linecap: round; stroke-linejoin: round;
      }
      .sn-search-btn kbd {
        background: #fff; border: 1px solid #c9d8ee;
        border-radius: 3px; padding: 0 5px;
        font-family: inherit; font-size: 10px; font-weight: 700;
        color: #1e5fa8;
      }
      @media (max-width: 700px) {
        /* スマホでもラベルは残す（site-header.js 側と同じ指定。こちらが後勝ちになる） */
        .sn-search-btn kbd { display: none; }
        .sn-search-btn { padding: 7px 10px; gap: 6px; }
        .sn-search-btn svg { width: 16px; height: 16px; }
        .sn-search-btn span.sn-search-label { font-size: 12px; }
        .ss-overlay { padding: 12px; }
        .ss-modal { max-height: calc(100vh - 24px); border-radius: 10px; }
        .ss-input { font-size: 16px; } /* iOSズーム防止 */
        .ss-input-wrap { padding: 12px 12px; gap: 8px; }
        .ss-close {
          width: 36px; height: 36px;
          font-size: 22px; font-weight: 700;
        }
      }
    `;

    // ── オーバーレイHTML ──
    const modalHtml = `
      <div class="ss-overlay" id="ss-overlay" aria-hidden="true">
        <div class="ss-modal" role="dialog" aria-label="サイト内検索">
          <div class="ss-input-wrap">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input class="ss-input" id="ss-input" type="search"
              placeholder="資料名・キーワードで検索"
              autocomplete="off" spellcheck="false" />
            <button class="ss-close" id="ss-close" aria-label="閉じる">×</button>
          </div>
          <div class="ss-results" id="ss-results"></div>
          <div class="ss-hint">
            <span><kbd>↑</kbd><kbd>↓</kbd> 移動</span>
            <span><kbd>Enter</kbd> 開く</span>
            <span><kbd>Esc</kbd> 閉じる</span>
            <a class="ss-hint-link" id="ss-all-pages" href="#">ページ一覧をカテゴリー別に見る ›</a>
          </div>
        </div>
      </div>
    `;

    // ── 注入 ──
    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    const wrap = document.createElement('div');
    wrap.innerHTML = modalHtml.trim();
    document.body.appendChild(wrap.firstChild);

    const overlay = document.getElementById('ss-overlay');
    const input = document.getElementById('ss-input');
    const results = document.getElementById('ss-results');
    const closeBtn = document.getElementById('ss-close');

    // ページ一覧へのリンク。サイトルートは実行時にしか分からないのでここで入れる
    const allPagesLink = document.getElementById('ss-all-pages');
    if (allPagesLink) allPagesLink.href = (window.SITE_ROOT || '') + 'ページ一覧.html';

    let active = -1;
    let currentResults = [];

    // 見出しの索引は初回に検索を開いたときだけ読む（全ページ表示で読ませない）
    let indexRequested = false;
    function loadHeadingIndex() {
      if (indexRequested || window.__searchIndex) return;
      indexRequested = true;
      const s = document.createElement('script');
      s.src = (window.SITE_ROOT || '') + 'assets/search-index.js';
      // 届いたら、開いたままの検索結果を組み直す
      s.onload = () => { if (overlay.classList.contains('ss-open')) render(input.value); };
      document.head.appendChild(s);
    }

    function open() {
      loadHeadingIndex();
      overlay.classList.add('ss-open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      input.value = '';
      render('');
      setTimeout(() => input.focus(), 30);
    }
    function close() {
      overlay.classList.remove('ss-open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    function escapeHtml(s) {
      return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    function escapeRegex(s) {
      return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function search(q) {
      q = q.trim().toLowerCase();
      if (!q) {
        // 空クエリ：履歴があれば履歴を、無ければ主要ページを表示
        const recents = (window.SITE_RECENTS && window.SITE_RECENTS.get()) || [];
        if (recents.length > 0) {
          const byFile = Object.create(null);
          for (const item of index) byFile[item.file] = item;
          return recents
            .map((r) => byFile[r.file])
            .filter(Boolean)
            .slice(0, 10);
        }
        return index.slice(0, 12);
      }
      hydrateTerms();
      const tokens = q.split(/\s+/).filter(Boolean);
      return index
        .map((item) => {
          let score = 0;
          let hitTerm = '';
          for (const t of tokens) {
            const titleIdx = item.titleLower.indexOf(t);
            const hayIdx = item.haystack.indexOf(t);
            if (hayIdx === -1) return null;
            if (titleIdx === 0) score += 100;       // タイトル先頭一致
            else if (titleIdx > 0) score += 50;     // タイトル中に含む
            else {
              // ページ名にはないが、ページ内の見出しに含まれる
              const ti = item.termsLower.findIndex((x) => x.indexOf(t) !== -1);
              if (ti !== -1) {
                score += 25;
                if (!hitTerm) hitTerm = item.terms[ti];
              } else {
                score += 10;                        // ファイル名 or カテゴリのみ
              }
            }
            score -= hayIdx * 0.1;                  // 早い位置ほど高評価
          }
          return { item: Object.assign({}, item, { hitTerm }), score };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.item)
        .slice(0, 30);
    }

    function highlight(text, q) {
      const safe = escapeHtml(text);
      if (!q.trim()) return safe;
      const tokens = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
      let result = safe;
      for (const t of tokens) {
        const re = new RegExp(`(${escapeRegex(escapeHtml(t))})`, 'gi');
        result = result.replace(re, '<mark>$1</mark>');
      }
      return result;
    }

    function render(q) {
      currentResults = search(q);
      active = currentResults.length > 0 ? 0 : -1;
      if (currentResults.length === 0) {
        results.innerHTML =
          '<div class="ss-empty">該当する資料が見つかりませんでした' +
          '<a class="ss-empty-link" href="' +
          escapeHtml((window.SITE_ROOT || '') + 'ページ一覧.html') +
          '">ページ一覧からさがす ›</a></div>';
        return;
      }
      const isEmpty = !q.trim();
      const hasRecents =
        isEmpty &&
        window.SITE_RECENTS &&
        window.SITE_RECENTS.get().length > 0;
      const label = isEmpty
        ? `<div class="ss-section-label">${hasRecents ? '最近見たページ' : '主要ページ'}</div>`
        : `<div class="ss-section-label">${currentResults.length} 件の候補</div>`;
      results.innerHTML =
        label +
        currentResults
          .map(
            (r, i) => `
        <a class="ss-item${i === active ? ' ss-active' : ''}" href="${escapeHtml((window.SITE_ROOT || '') + r.file)}" data-idx="${i}">
          <div class="ss-item-title">${highlight(r.title, q)}</div>
          <div class="ss-item-meta">${escapeHtml(r.categoryName)}${
            r.hitTerm ? ` <span class="ss-item-hit">ページ内：${highlight(r.hitTerm, q)}</span>` : ''
          }</div>
        </a>`
          )
          .join('');
    }

    function setActive(i) {
      const items = results.querySelectorAll('.ss-item');
      items.forEach((el, idx) => el.classList.toggle('ss-active', idx === i));
      const el = items[i];
      if (el) el.scrollIntoView({ block: 'nearest' });
      active = i;
    }

    input.addEventListener('input', (e) => render(e.target.value));

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentResults.length) setActive(Math.min(active + 1, currentResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentResults.length) setActive(Math.max(active - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (active >= 0 && currentResults[active]) {
          location.href = (window.SITE_ROOT || '') + currentResults[active].file;
        }
      } else if (e.key === 'Escape') {
        close();
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    closeBtn.addEventListener('click', close);

    // ホバーでアクティブ追従
    results.addEventListener('mouseover', (e) => {
      const el = e.target.closest('.ss-item');
      if (!el) return;
      const idx = Number(el.dataset.idx);
      if (!Number.isNaN(idx)) setActive(idx);
    });

    // ヘッダーの検索ボタン
    const btn = document.getElementById('sn-search-btn');
    if (btn) btn.addEventListener('click', open);

    // ショートカット：「/」または Ctrl/Cmd+K
    document.addEventListener('keydown', (e) => {
      if (overlay.classList.contains('ss-open')) return;
      const inField =
        document.activeElement &&
        /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (e.key === '/' && !inField) {
        e.preventDefault();
        open();
      } else if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        open();
      }
    });

    // 公開API
    window.SITE_SEARCH_OPEN = open;
  }

  if (window.SITE_PAGES) {
    init();
  } else {
    // site-header.js より先に読み込まれた場合に備えて待機
    document.addEventListener('DOMContentLoaded', init);
  }
})();
