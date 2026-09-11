/**
 * 最近見たページ（localStorage）
 *
 * - ページ表示ごとに履歴を記録（最大10件・重複時は最新位置に）
 * - window.SITE_RECENTS.get() で参照する
 *     トップ（index.html）… 「探す」の欄に直近3件
 *     site-search.js    … 検索を空のまま開くと履歴10件
 *   （2026-09-11 のトップ刷新で、トップに10件並べる表示と削除ボタンはやめた）
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

  // 公開API（index.html・site-search.js から利用）
  window.SITE_RECENTS = { get: load };

  if (window.SITE_PAGES) record();
  else document.addEventListener('DOMContentLoaded', record);
})();
