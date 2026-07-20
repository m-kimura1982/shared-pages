/**
 * 最近見たページ（localStorage）
 *
 * - ページ表示ごとに履歴を記録（最大10件・重複時は最新位置に）
 * - index.html の #site-recents-section に自動描画
 * - site-search.js から window.SITE_RECENTS.get() で参照可能
 */
(function () {
  const KEY = 'site-recents-v1';
  const MAX = 10;

  function load() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }
  function save(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* noop */
    }
  }

  function record() {
    const PAGES = window.SITE_PAGES;
    if (!PAGES) return;
    // site-header.js が算出したサイトルート相対キーを優先（サブディレクトリ対応）
    const filename =
      window.SITE_PAGE_KEY ||
      decodeURIComponent(location.pathname.split('/').pop() || 'index.html');
    const info = PAGES[filename];
    if (!info) return;
    // ホーム・更新履歴は履歴として扱わない
    if (info.category === 'home') return;

    let list = load().filter((x) => x.file !== filename);
    list.unshift({
      file: filename,
      title: info.title,
      category: info.category,
      ts: Date.now(),
    });
    save(list.slice(0, MAX));
  }

  function escapeHtml(s) {
    return String(s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  function renderInto(section) {
    if (!section) return;
    const list = load();
    if (list.length === 0) {
      section.style.display = 'none';
      return;
    }
    section.style.display = '';
    const container = section.querySelector('#site-recents-container');
    if (!container) return;

    container.innerHTML = `
      <div class="recents-list">
        ${list
          .map(
            (item) => `
              <div class="recents-item-wrap">
                <a class="recents-item" href="${escapeHtml((window.SITE_ROOT || '') + item.file)}">
                  <span class="recents-name">${escapeHtml(item.title)}</span>
                </a>
                <button class="recents-del" data-file="${escapeHtml(item.file)}" aria-label="この履歴を削除">×</button>
              </div>`
          )
          .join('')}
      </div>
      <div class="recents-actions">
        <button class="recents-clear" type="button">履歴をすべてクリア</button>
      </div>
    `;

    container.querySelectorAll('.recents-del').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const f = btn.dataset.file;
        save(load().filter((x) => x.file !== f));
        renderInto(section);
      });
    });
    const clearBtn = container.querySelector('.recents-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (load().length === 0) return;
        if (confirm('最近見たページの履歴をすべてクリアします。よろしいですか？')) {
          save([]);
          renderInto(section);
        }
      });
    }
  }

  const css = `
    #site-recents-section .recents-list {
      display: flex; flex-wrap: wrap; gap: 6px;
    }
    #site-recents-section .recents-item-wrap {
      display: inline-flex; align-items: center;
      background: #e8f0fb;
      border: 1px solid #cfdef3;
      border-radius: 999px;
      transition: border-color 0.15s, background 0.15s;
    }
    #site-recents-section .recents-item-wrap:hover {
      border-color: #1e5fa8;
      background: #d6e4f6;
    }
    #site-recents-section .recents-item {
      padding: 5px 4px 5px 14px;
      text-decoration: none; color: #1e5fa8;
      line-height: 1.4;
    }
    #site-recents-section .recents-name {
      font-size: 12.5px; font-weight: 700;
    }
    #site-recents-section .recents-del {
      background: transparent; border: none; cursor: pointer;
      width: 22px; height: 22px;
      margin-right: 4px;
      font-size: 13px; line-height: 1; color: #6b8bb5;
      border-radius: 50%;
      transition: background 0.15s, color 0.15s;
      display: flex; align-items: center; justify-content: center;
    }
    #site-recents-section .recents-del:hover {
      background: #fdecec; color: #d04a4a;
    }
    #site-recents-section .recents-actions {
      margin-top: 12px;
    }
    #site-recents-section .recents-clear {
      background: transparent; border: none;
      font-family: inherit; font-size: 11.5px;
      color: #999; cursor: pointer;
      padding: 2px 4px;
      text-decoration: underline;
    }
    #site-recents-section .recents-clear:hover { color: #d04a4a; }
  `;

  function init() {
    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    record();
    renderInto(document.getElementById('site-recents-section'));
  }

  // 公開API（site-search.js などから利用）
  window.SITE_RECENTS = {
    get: load,
    remove(file) {
      save(load().filter((x) => x.file !== file));
      renderInto(document.getElementById('site-recents-section'));
    },
    clear() {
      save([]);
      renderInto(document.getElementById('site-recents-section'));
    },
  };

  if (window.SITE_PAGES) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
