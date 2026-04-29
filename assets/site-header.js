/**
 * 共通ヘッダー＋パンくずリスト（自動注入）
 *
 * 使い方：
 *   各HTMLの <body> 直後に以下1行を入れるだけ
 *   <script src="assets/site-header.js" defer></script>
 *
 * パンくず・ナビは現在のファイル名から自動判定。
 * 新規ページを追加した時は、このファイルの PAGES に1行足すだけでOK。
 */
(function () {
  // ── ページごとの所属カテゴリ・表示名 ──
  // category: 'home' | 'kaitei' | 'tools' | 'knowledge'
  const PAGES = {
    // サイト構造
    'index.html': { category: 'home', title: 'ホーム' },
    'kaitei2026.html': { category: 'kaitei', title: '2026改定資料' },
    'tools.html': { category: 'tools', title: '実務ツール集' },
    'knowledge.html': { category: 'knowledge', title: '実務ナレッジ集' },

    // ツール
    'gigi-search.html': { category: 'tools', title: '疑義解釈 全文検索' },
    '地域支援医薬品供給対応体制加算_届出判定ツール.html': { category: 'tools', title: '地域支援・届出判定ツール' },
    '服薬管理指導料等を算定する場合における他の薬学管理料の算定の可否.html': { category: 'tools', title: '別表１（１）併算定可否チェック' },

    // 実務ナレッジ
    '変更調剤について.html': { category: 'knowledge', title: '変更調剤について' },
    '基礎的医薬品追加リストR8_4.html': { category: 'knowledge', title: '基礎的医薬品 追加リスト（R8.4）' },

    // 改定資料（個別）
    '調剤基本料_2026改定.html': { category: 'kaitei', title: '調剤基本料' },
    '調剤基本料フローチャート.html': { category: 'kaitei', title: '調剤基本料フローチャート' },
    '調剤管理料_2026改定.html': { category: 'kaitei', title: '調剤管理料' },
    '調剤ベースアップ評価料.html': { category: 'kaitei', title: '調剤ベースアップ評価料' },
    '調剤物価対応料.html': { category: 'kaitei', title: '調剤物価対応料' },
    '調剤時残薬調整加算.html': { category: 'kaitei', title: '調剤時残薬調整加算' },
    '調剤報酬体系図_2026改定.html': { category: 'kaitei', title: '調剤報酬体系図' },
    '調剤報酬改定2026_ダイジェスト.html': { category: 'kaitei', title: '2026改定 ダイジェスト' },
    '調剤報酬点数早見表2026.html': { category: 'kaitei', title: '調剤報酬点数早見表' },
    '服薬管理指導料.html': { category: 'kaitei', title: '服薬管理指導料' },
    '服用薬剤調整支援料２_2026改定.html': { category: 'kaitei', title: '服用薬剤調整支援料２' },
    '服用薬剤調整支援料２_資格取得ステップ.html': { category: 'kaitei', title: '服用薬剤調整支援料２ 資格取得ステップ' },
    '吸入薬指導加算2026.html': { category: 'kaitei', title: '吸入薬指導加算' },
    '在宅薬学総合体制加算2026.html': { category: 'kaitei', title: '在宅薬学総合体制加算' },
    '在宅患者訪問薬剤管理指導料_算定間隔2026.html': { category: 'kaitei', title: '訪問薬剤管理指導料の算定間隔' },
    '電子的調剤情報連携体制整備加算_2026改定.html': { category: 'kaitei', title: '電子的調剤情報連携体制整備加算' },
    '地域支援医薬品供給対応体制加算.html': { category: 'kaitei', title: '地域支援・医薬品供給対応体制加算' },
    'バイオ後続品調剤体制加算.html': { category: 'kaitei', title: 'バイオ後続品調剤体制加算' },
    '薬学的有害事象等防止加算.html': { category: 'kaitei', title: '薬学的有害事象等防止加算' },
    '門前薬局等立地依存減算.html': { category: 'kaitei', title: '門前薬局等立地依存減算' },
    'かかりつけ薬剤師_算定一覧2026.html': { category: 'kaitei', title: 'かかりつけ薬剤師 算定一覧' },
    '【簡易版】かかりつけ薬剤師に関わる管理料・加算一覧.html': { category: 'kaitei', title: 'かかりつけ薬剤師 算定一覧（簡易版）' },
    'かかりつけ薬剤師フォローアップ加算.html': { category: 'kaitei', title: 'かかりつけ薬剤師フォローアップ加算' },
    'かかりつけ薬剤師訪問加算.html': { category: 'kaitei', title: 'かかりつけ薬剤師訪問加算' },
    '複数名薬剤管理指導訪問料.html': { category: 'kaitei', title: '複数名薬剤管理指導訪問料' },
    '訪問薬剤管理医師同時指導料.html': { category: 'kaitei', title: '訪問薬剤管理医師同時指導料' },
    '選定療養_概要2026.html': { category: 'kaitei', title: '選定療養 概要' },
    '選定療養_計算方法2026.html': { category: 'kaitei', title: '選定療養 計算方法' },
    '疑義解釈_その1_2026.html': { category: 'kaitei', title: '疑義解釈 その1' },
    '疑義解釈_その2_2026.html': { category: 'kaitei', title: '疑義解釈 その2' },
    '疑義解釈_その3_2026.html': { category: 'kaitei', title: '疑義解釈 その3' },
    '特掲診療料_施設基準届出_調剤関係2026.html': { category: 'kaitei', title: '特掲診療料 施設基準届出（調剤関係）' },
    '別添3_調剤報酬点数表に関する事項2026.html': { category: 'kaitei', title: '別添3 点数表に関する事項' },
    '別表Ⅰ_調剤報酬明細書摘要欄記載事項2026.html': { category: 'kaitei', title: '別表Ⅰ 摘要欄記載事項' },
    '別表Ⅴ_調剤行為名称等の略号一覧2026改定.html': { category: 'kaitei', title: '別表Ⅴ 略号一覧' },
    '別表第三_調剤報酬点数表2026.html': { category: 'kaitei', title: '別表第三 調剤報酬点数表' },
    '栄養保持を目的とした医薬品の保険給付の適正化.html': { category: 'kaitei', title: '栄養保持を目的とした医薬品の保険給付の適正化' },
    '事務スタッフ向け_2026調剤報酬改定ポイント整理.html': { category: 'kaitei', title: '事務スタッフ向け 改定ポイント整理' },
  };

  const CATEGORIES = {
    home: { name: 'ホーム', url: 'index.html' },
    kaitei: { name: '2026改定資料', url: 'kaitei2026.html' },
    tools: { name: '実務ツール集', url: 'tools.html' },
    knowledge: { name: '実務ナレッジ集', url: 'knowledge.html' },
  };

  // ── 現在のページ判定 ──
  const path = location.pathname;
  const rawFile = path.split('/').pop() || 'index.html';
  const filename = decodeURIComponent(rawFile) || 'index.html';
  const pageInfo = PAGES[filename] || { category: null, title: document.title };
  const category = pageInfo.category;
  const isHome = category === 'home';

  // ── スタイル（スコープ：.sn- prefix で既存CSSと衝突回避） ──
  const css = `
    .sn-wrap { display: contents; font-family: "Noto Sans JP", sans-serif; }
    .sn-header {
      background: #ffffff;
      border-bottom: 1px solid #d8dde8;
      padding: 12px 24px;
      position: sticky; top: 0; z-index: 100;
    }
    .sn-header-inner {
      max-width: 1000px; margin: 0 auto;
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
    }
    .sn-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
    .sn-logo img { height: 24px; opacity: 0.85; }
    .sn-logo-text { font-size: 14px; font-weight: 700; color: #222; letter-spacing: .02em; }
    .sn-nav { display: flex; gap: 4px; align-items: center; }
    .sn-nav a {
      font-size: 14px; font-weight: 500; color: #444;
      text-decoration: none; padding: 8px 14px; border-radius: 6px;
      transition: background 0.15s, color 0.15s;
    }
    .sn-nav a:hover { background: #f0f4fa; color: #1e5fa8; }
    .sn-nav a.sn-active { color: #1e5fa8; font-weight: 700; }
    .sn-toggle {
      display: none; background: none; border: none; cursor: pointer;
      width: 36px; height: 36px; padding: 0;
      align-items: center; justify-content: center;
    }
    .sn-toggle svg { width: 22px; height: 22px; stroke: #222; stroke-width: 2; fill: none; stroke-linecap: round; }

    /* パンくず */
    .sn-crumb {
      max-width: 1000px; margin: 0 auto;
      padding: 16px 24px 20px;
      font-size: 14px; color: #555;
      display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
    }
    .sn-crumb a { color: #1e5fa8; text-decoration: none; }
    .sn-crumb a:hover { text-decoration: underline; }
    .sn-crumb-sep { color: #777; font-size: 14px; font-weight: 700; }
    .sn-crumb-current { color: #555; font-weight: 400; }

    /* モバイル */
    @media (max-width: 700px) {
      .sn-header { padding: 10px 16px; }
      .sn-toggle { display: flex; }
      .sn-nav {
        display: none;
        position: absolute; top: 100%; left: 0; right: 0;
        background: #fff; border-bottom: 1px solid #d8dde8;
        flex-direction: column; gap: 0; padding: 8px 16px 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      }
      .sn-nav.sn-open { display: flex; }
      .sn-nav a { padding: 12px 8px; border-radius: 0; border-bottom: 1px solid #f0f2f5; }
      .sn-nav a:last-child { border-bottom: none; }
      .sn-crumb { padding: 8px 16px 0; }
    }
  `;

  // ── HTML 構築 ──
  const navItems = [
    { cat: 'home', label: 'ホーム' },
    { cat: 'kaitei', label: '改定資料' },
    { cat: 'tools', label: 'ツール' },
    { cat: 'knowledge', label: 'ナレッジ' },
  ];

  const navHtml = navItems
    .map(
      (n) =>
        `<a href="${CATEGORIES[n.cat].url}" class="${
          category === n.cat ? 'sn-active' : ''
        }">${n.label}</a>`
    )
    .join('');

  // パンくず（ホーム以外で表示）
  let crumbHtml = '';
  if (!isHome && category) {
    const cat = CATEGORIES[category];
    const isCategoryLanding = filename === cat.url;
    if (isCategoryLanding) {
      crumbHtml = `
        <nav class="sn-crumb" aria-label="パンくずリスト">
          <a href="index.html">ホーム</a>
          <span class="sn-crumb-sep">›</span>
          <span class="sn-crumb-current">${cat.name}</span>
        </nav>`;
    } else {
      crumbHtml = `
        <nav class="sn-crumb" aria-label="パンくずリスト">
          <a href="index.html">ホーム</a>
          <span class="sn-crumb-sep">›</span>
          <a href="${cat.url}">${cat.name}</a>
          <span class="sn-crumb-sep">›</span>
          <span class="sn-crumb-current">${pageInfo.title}</span>
        </nav>`;
    }
  }

  const headerHtml = `
    <div class="sn-wrap">
      <header class="sn-header">
        <div class="sn-header-inner">
          <a href="index.html" class="sn-logo">
            <img src="${getLogoPath()}" alt="Hello Group">
          </a>
          <nav class="sn-nav" id="sn-nav">${navHtml}</nav>
          <button class="sn-toggle" id="sn-toggle" aria-label="メニュー">
            <svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>
      </header>
      ${crumbHtml}
    </div>
  `;

  // ロゴ画像のパス（サブディレクトリ対応）
  function getLogoPath() {
    // 現状は全ページが同じディレクトリ。将来サブディレクトリができたらここを調整
    return '会社ロゴ.png';
  }

  // ── favicon 自動注入（既に <link rel="icon"> がある場合はスキップ） ──
  if (!document.querySelector('link[rel="icon"]')) {
    const favicons = [
      { rel: 'icon', href: 'favicon.ico', sizes: 'any' },
      { rel: 'icon', type: 'image/svg+xml', href: 'favicon.svg' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: 'favicon.png' },
      { rel: 'apple-touch-icon', href: 'apple-touch-icon.png' },
    ];
    favicons.forEach((f) => {
      const link = document.createElement('link');
      Object.entries(f).forEach(([k, v]) => link.setAttribute(k, v));
      document.head.appendChild(link);
    });
  }

  // ── 注入 ──
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // 既存の body padding-top を打ち消す（個別ページ用）
  const bodyStyleFix = document.createElement('style');
  bodyStyleFix.textContent = `body { padding-top: 0 !important; }`;
  document.head.appendChild(bodyStyleFix);

  const container = document.createElement('div');
  container.innerHTML = headerHtml.trim();
  document.body.insertBefore(container.firstChild, document.body.firstChild);

  // ハンバーガー開閉
  const toggle = document.getElementById('sn-toggle');
  const nav = document.getElementById('sn-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('sn-open'));
  }
})();
