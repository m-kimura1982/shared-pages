/**
 * 共通ヘッダー＋パンくずリスト（自動注入）
 *
 * 使い方：
 *   各HTMLの <body> 直後に以下1行を入れるだけ
 *   <script src="assets/site-header.js" defer></script>
 *
 * パンくず・ナビは「サイトルートからの相対パス」で自動判定。
 * 新規ページを追加した時は、このファイルの PAGES に1行足すだけでOK。
 * サブディレクトリのページは 'yakureki/index.html' のようにパス付きキーで登録する
 * （ルートの index.html とは別キーになるので衝突しない）。
 * サブディレクトリ側からの読み込みは <script src="../assets/site-header.js" defer></script>。
 */
(function () {
  // ── サイトルートの自動判定 ──
  // このスクリプト自身の src（…/assets/site-header.js）からルートURLを導出する。
  // ローカル（http://localhost:3000/）でも GitHub Pages（/shared-pages/）でも同じコードで動く。
  const SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '';
  const ROOT = SCRIPT_SRC ? new URL('..', SCRIPT_SRC).href : '';
  const u = (p) => (ROOT ? ROOT + p : p); // サイトルート相対パス → 実URL

  // ── ページごとの所属カテゴリ・表示名 ──
  // category: 'home' | 'kaitei' | 'kasan' | 'checklist' | 'tools' | 'knowledge' | 'yakureki' | 'jimu'
  // 未登録のページはサイト内検索・パンくずに出ない。新規公開時は必ずここに1行足すこと
  const PAGES = {
    // サイト構造
    'index.html': { category: 'home', title: 'ホーム' },
    'updates.html': { category: 'home', title: '更新履歴' },
    'kaitei2026.html': { category: 'kaitei', title: '2026改定資料' },
    '加算まとめ.html': { category: 'kasan', title: '算定項目まとめ' },
    'checklists.html': { category: 'checklist', title: '算定チェックリスト' },
    'tools.html': { category: 'tools', title: '実務ツール集' },
    'knowledge.html': { category: 'knowledge', title: '実務ナレッジ集' },
    '事務スタッフ向け.html': { category: 'jimu', title: '事務スタッフ向け' },
    'ページ一覧.html': { category: 'home', title: 'ページ一覧' },

    // ツール
    'ツール/gigi-search.html': { category: 'tools', title: '疑義解釈 全文検索' },
    'ツール/地域支援医薬品供給対応体制加算_届出判定ツール.html': { category: 'tools', title: '地域支援・届出判定ツール' },
    'ツール/服薬管理指導料等を算定する場合における他の薬学管理料の算定の可否.html': { category: 'tools', title: '別表１（１）併算定可否チェック' },
    'ツール/選定療養費計算ツール.html': { category: 'tools', title: '選定療養費 計算ツール' },

    // 実務ナレッジ
    'ナレッジ/変更調剤について.html': { category: 'knowledge', title: '変更調剤について' },
    'ナレッジ/リフィル処方箋.html': { category: 'knowledge', title: 'リフィル処方箋' },
    'ナレッジ/基礎的医薬品追加リストR8_4.html': { category: 'knowledge', title: '基礎的医薬品 追加リスト（R8.4）' },
    'ナレッジ/調剤報酬QA.html': { category: 'knowledge', title: '調剤報酬 社内Q&A' },
    'ナレッジ/高額療養費と薬局窓口対応.html': { category: 'knowledge', title: '高額療養費と薬局窓口対応' },
    'ナレッジ/高額療養費制度の見直し2026.html': { category: 'knowledge', title: '高額療養費制度の見直し（2026年8月）' },

    // 薬歴（2026-07-20公開。サブディレクトリ yakureki/ 配下・パスキーで登録）
    'yakureki/薬歴の書き方_実例解説集.html': { category: 'yakureki', title: '薬歴の書き方｜実例解説集' },
    'yakureki/index.html': { category: 'yakureki', title: '薬歴マニュアル' },
    'yakureki/基本記載ルール.html': { category: 'yakureki', title: '薬歴の基本記載ルール' },
    'yakureki/個別指導で問われる記載.html': { category: 'yakureki', title: '個別指導で問われる項目と薬歴の残し方' },
    'yakureki/加算別記載一覧.html': { category: 'yakureki', title: '加算別 薬歴記載一覧' },
    'yakureki/乳幼児服薬指導加算.html': { category: 'yakureki', title: '乳幼児服薬指導加算の薬歴記載' },
    'yakureki/ハイリスク薬指導.html': { category: 'yakureki', title: 'ハイリスク薬指導（特定薬剤管理指導加算1）' },
    'yakureki/ハイリスク_血液凝固阻止剤.html': { category: 'yakureki', title: 'ハイリスク薬 血液凝固阻止剤' },
    'yakureki/ハイリスク_糖尿病用剤.html': { category: 'yakureki', title: 'ハイリスク薬 糖尿病用剤' },
    'yakureki/ハイリスク_膵臓ホルモン剤.html': { category: 'yakureki', title: 'ハイリスク薬 インスリン製剤' },
    'yakureki/ハイリスク_抗精神病薬.html': { category: 'yakureki', title: 'ハイリスク薬 抗精神病薬' },
    'yakureki/ハイリスク_抗うつ薬.html': { category: 'yakureki', title: 'ハイリスク薬 抗うつ薬' },
    'yakureki/ハイリスク_気分安定薬.html': { category: 'yakureki', title: 'ハイリスク薬 気分安定薬' },
    'yakureki/ハイリスク_抗てんかん薬.html': { category: 'yakureki', title: 'ハイリスク薬 抗てんかん薬' },
    'yakureki/テンプレート集.html': { category: 'yakureki', title: '薬歴テンプレート・文例集' },
    'yakureki/テンプレート_汎用.html': { category: 'yakureki', title: '汎用 定型文集' },
    'yakureki/テンプレート_メンタル.html': { category: 'yakureki', title: 'メンタル系 定型文集' },
    'yakureki/テンプレート_循環器.html': { category: 'yakureki', title: '循環器系 定型文集' },

    // 加算まとめ（恒久ページ。kaitei2026 のカードからもリンクされるが、所属は加算まとめ）
    '加算まとめ/調剤基本料_2026改定.html': { category: 'kasan', title: '調剤基本料' },
    '加算まとめ/地域支援医薬品供給対応体制加算.html': { category: 'kasan', title: '地域支援・医薬品供給対応体制加算' },
    '加算まとめ/在宅薬学総合体制加算2026.html': { category: 'kasan', title: '在宅薬学総合体制加算' },
    '加算まとめ/バイオ後続品調剤体制加算.html': { category: 'kasan', title: 'バイオ後続品調剤体制加算' },
    '加算まとめ/電子的調剤情報連携体制整備加算_2026改定.html': { category: 'kasan', title: '電子的調剤情報連携体制整備加算' },
    '加算まとめ/調剤管理料_2026改定.html': { category: 'kasan', title: '調剤管理料' },
    '加算まとめ/調剤時残薬調整加算.html': { category: 'kasan', title: '調剤時残薬調整加算' },
    '加算まとめ/薬学的有害事象等防止加算.html': { category: 'kasan', title: '薬学的有害事象等防止加算' },
    '加算まとめ/服薬管理指導料.html': { category: 'kasan', title: '服薬管理指導料' },
    '加算まとめ/服薬管理指導料3・4_施設訪問・オンライン.html': { category: 'kasan', title: '服薬管理指導料 3・4（施設訪問・オンライン）' },
    '加算まとめ/特定薬剤管理指導加算2.html': { category: 'kasan', title: '特定薬剤管理指導加算２' },
    '加算まとめ/特定薬剤管理指導加算3.html': { category: 'kasan', title: '特定薬剤管理指導加算３' },
    '加算まとめ/吸入薬指導加算2026.html': { category: 'kasan', title: '吸入薬指導加算' },
    '加算まとめ/乳幼児服薬指導加算.html': { category: 'kasan', title: '乳幼児服薬指導加算' },
    '加算まとめ/かかりつけ薬剤師フォローアップ加算.html': { category: 'kasan', title: 'かかりつけ薬剤師フォローアップ加算' },
    '加算まとめ/かかりつけ薬剤師訪問加算.html': { category: 'kasan', title: 'かかりつけ薬剤師訪問加算' },
    '加算まとめ/服用薬剤調整支援料２_2026改定.html': { category: 'kasan', title: '服用薬剤調整支援料２' },
    '加算まとめ/外来服薬支援料1.html': { category: 'kasan', title: '外来服薬支援料１' },
    '加算まとめ/外来服薬支援料1_算定事例.html': { category: 'kasan', title: '外来服薬支援料１ 算定事例' },
    '加算まとめ/服薬情報等提供料.html': { category: 'kasan', title: '服薬情報等提供料１・２・３' },
    '加算まとめ/在宅患者訪問薬剤管理指導料_算定間隔2026.html': { category: 'kasan', title: '訪問薬剤管理指導料の算定間隔' },
    '加算まとめ/複数名薬剤管理指導訪問料.html': { category: 'kasan', title: '複数名薬剤管理指導訪問料' },
    '加算まとめ/訪問薬剤管理医師同時指導料.html': { category: 'kasan', title: '訪問薬剤管理医師同時指導料' },

    // 算定チェックリスト
    'チェックリスト/選定療養_実務チェックリスト.html': { category: 'checklist', title: '選定療養 算定チェックリスト' },
    'チェックリスト/調剤時残薬調整加算_実務チェックリスト.html': { category: 'checklist', title: '調剤時残薬調整加算 算定チェックリスト' },
    'チェックリスト/薬学的有害事象等防止加算_実務チェックリスト.html': { category: 'checklist', title: '薬学的有害事象等防止加算 算定チェックリスト' },
    'チェックリスト/かかりつけ薬剤師フォローアップ加算_実務チェックリスト.html': { category: 'checklist', title: 'かかりつけ薬剤師フォローアップ加算 算定チェックリスト' },
    'チェックリスト/かかりつけ薬剤師訪問加算_実務チェックリスト.html': { category: 'checklist', title: 'かかりつけ薬剤師訪問加算 算定チェックリスト' },
    'チェックリスト/栄養保持を目的とした医薬品_確認チェックリスト.html': { category: 'checklist', title: '栄養保持を目的とした医薬品 確認チェックリスト' },
    'チェックリスト/吸入薬指導加算_実務チェックリスト.html': { category: 'checklist', title: '吸入薬指導加算 算定チェックリスト' },
    'チェックリスト/リフィル処方箋_実務チェックリスト.html': { category: 'checklist', title: 'リフィル処方箋 対応の流れ' },

    // 事務スタッフ向け（個別）
    '事務/事務スタッフ向け_2026調剤報酬改定ポイント整理.html': { category: 'jimu', title: '事務スタッフ向け 改定ポイント整理' },
    '事務/事務スタッフ向け_2026改定サマリ.html': { category: 'jimu', title: '事務スタッフ向け 2026改定サマリ' },
    '事務/入力画面で解説_2026改定後の入力方法.html': { category: 'jimu', title: '入力画面で解説｜2026改定後の入力方法（Pharnes）' },

    // 改定資料(個別)
    '改定資料/調剤基本料フローチャート.html': { category: 'kaitei', title: '調剤基本料フローチャート' },
    '改定資料/調剤ベースアップ評価料.html': { category: 'kaitei', title: '調剤ベースアップ評価料' },
    '改定資料/調剤物価対応料.html': { category: 'kaitei', title: '調剤物価対応料' },
    '改定資料/調剤報酬体系図_2026改定.html': { category: 'kaitei', title: '調剤報酬体系図' },
    '改定資料/調剤報酬改定2026_ダイジェスト.html': { category: 'kaitei', title: '2026改定 ダイジェスト' },
    '改定資料/調剤報酬点数早見表2026.html': { category: 'kaitei', title: '調剤報酬点数早見表' },
    '改定資料/服用薬剤調整支援料２_資格取得ステップ.html': { category: 'kaitei', title: '服用薬剤調整支援料２ 資格取得ステップ' },
    '改定資料/在宅薬学総合体制加算2イ_特例摘要欄ガイド.html': { category: 'kaitei', title: '在宅薬学総合体制加算２イ特例 摘要欄ガイド' },
    '改定資料/門前薬局等立地依存減算.html': { category: 'kaitei', title: '門前薬局等立地依存減算' },
    '改定資料/かかりつけ薬剤師_算定一覧2026.html': { category: 'kaitei', title: 'かかりつけ薬剤師 算定一覧' },
    '改定資料/【簡易版】かかりつけ薬剤師に関わる管理料・加算一覧.html': { category: 'kaitei', title: 'かかりつけ薬剤師 算定一覧（簡易版）' },
    '改定資料/選定療養_概要2026.html': { category: 'kaitei', title: '選定療養 概要' },
    '改定資料/疑義解釈まとめ2026.html': { category: 'kaitei', title: '疑義解釈まとめ（調剤関係）' },
    '改定資料/特掲診療料_施設基準届出_調剤関係2026.html': { category: 'kaitei', title: '特掲診療料 施設基準届出（調剤関係）' },
    '改定資料/別添3_調剤報酬点数表に関する事項2026.html': { category: 'kaitei', title: '別添3 点数表に関する事項' },
    '改定資料/別表Ⅰ_調剤報酬明細書摘要欄記載事項2026.html': { category: 'kaitei', title: '別表Ⅰ 摘要欄記載事項' },
    '改定資料/別表Ⅴ_調剤行為名称等の略号一覧2026改定.html': { category: 'kaitei', title: '別表Ⅴ 略号一覧' },
    '改定資料/別表第三_調剤報酬点数表2026.html': { category: 'kaitei', title: '別表第三 調剤報酬点数表' },
    '改定資料/栄養保持を目的とした医薬品の保険給付の適正化.html': { category: 'kaitei', title: '栄養保持を目的とした医薬品の保険給付の適正化' },
  };

  const CATEGORIES = {
    home: { name: 'ホーム', url: 'index.html' },
    kaitei: { name: '2026改定資料', url: 'kaitei2026.html' },
    kasan: { name: '算定項目まとめ', url: '加算まとめ.html' },
    checklist: { name: '算定チェックリスト', url: 'checklists.html' },
    tools: { name: '実務ツール集', url: 'tools.html' },
    knowledge: { name: '実務ナレッジ集', url: 'knowledge.html' },
    yakureki: { name: '薬歴', url: 'yakureki/index.html' },
    jimu: { name: '事務スタッフ向け', url: '事務スタッフ向け.html' },
  };

  // サイト内検索（site-search.js）等から参照
  window.SITE_PAGES = PAGES;
  window.SITE_CATEGORIES = CATEGORIES;
  window.SITE_ROOT = ROOT; // 'http://…/shared-pages/' 形式（末尾スラッシュあり）

  // ── 現在のページ判定（サイトルートからの相対パスをキーにする） ──
  let pageKey;
  const rootPath = ROOT ? new URL(ROOT).pathname : '';
  if (rootPath && location.pathname.startsWith(rootPath)) {
    pageKey = decodeURIComponent(location.pathname.slice(rootPath.length));
  } else {
    // 保険：ルートが導出できない場合は旧来どおりファイル名だけで判定
    pageKey = decodeURIComponent(location.pathname.split('/').pop() || '');
  }
  if (pageKey === '' || pageKey.endsWith('/')) pageKey += 'index.html';
  window.SITE_PAGE_KEY = pageKey;

  const filename = pageKey;
  const pageInfo = PAGES[filename] || { category: null, title: document.title };
  const category = pageInfo.category;
  // トップだけがパンくず不要。更新履歴・ページ一覧（category: 'home'）にも「ホーム ›」を出す
  const isHome = filename === 'index.html';

  // ── スタイル（スコープ：.sn- prefix で既存CSSと衝突回避） ──
  const css = `
    /* 固定ヘッダーの高さ。sticky な目次や scroll-margin-top を持つページが
       calc(var(--sn-header-h) + 余白) で参照する。
       このスクリプトが読めなかったときは各ページの fallback 値（0px）に戻る。 */
    :root { --sn-header-h: 66px; }
    @media (max-width: 700px) { :root { --sn-header-h: 57px; } }
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
    .sn-nav { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
    .sn-nav a {
      font-size: 14px; font-weight: 500; color: #444;
      text-decoration: none; padding: 8px 14px; border-radius: 6px;
      white-space: nowrap;
      transition: background 0.15s, color 0.15s;
    }
    /* 項目が増えても1行に収まるよう、狭めのPC幅では余白を詰める（ラベル内では改行させない） */
    @media (max-width: 1000px) {
      .sn-nav a { padding: 8px 9px; }
      .sn-header-inner { gap: 10px; }
    }
    .sn-nav a:hover { background: #f0f4fa; color: #1e5fa8; }
    .sn-nav a.sn-active { color: #1e5fa8; font-weight: 700; }
    .sn-actions { display: flex; align-items: center; gap: 8px; }
    .sn-toggle {
      display: none; background: none; border: none; cursor: pointer;
      width: 36px; height: 36px; padding: 0;
      align-items: center; justify-content: center;
    }
    .sn-toggle svg { width: 22px; height: 22px; stroke: #222; stroke-width: 2; fill: none; stroke-linecap: round; }

    /* 検索ボタン（ヘッダー埋め込み用：FOUC防止のためここで定義） */
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
    .sn-search-btn:hover { background: #d6e4f6; border-color: #1e5fa8; }
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
      .sn-search-btn span.sn-search-label,
      .sn-search-btn kbd { display: none; }
      .sn-search-btn { padding: 8px; }
      .sn-search-btn svg { width: 18px; height: 18px; }
    }

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

    /* 同じカテゴリーの他のページ（本文の最後に自動で置く）
       フォーラムから個別ページに直接来る人が大半で、読み終えたあとの行き先がないため */
    .sn-siblings {
      max-width: 1000px; margin: 40px auto 0;
      padding: 22px 24px 8px;
      border-top: 1px solid #d8dde8;
      font-family: "Noto Sans JP", sans-serif;
    }
    .sn-sib-head {
      display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .sn-sib-title { font-size: 14px; font-weight: 700; color: #222; }
    .sn-sib-hub { margin-left: auto; font-size: 12px; font-weight: 700; color: #1e5fa8; text-decoration: none; white-space: nowrap; }
    .sn-sib-hub:hover { text-decoration: underline; }
    .sn-sib-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px 24px; }
    .sn-sib-grid a {
      display: flex; align-items: baseline; gap: 8px;
      padding: 7px 2px; font-size: 13px; line-height: 1.55;
      color: #444; text-decoration: none;
      border-bottom: 0.5px solid #eef0f4;
    }
    .sn-sib-grid a::before { content: "›"; color: #1e5fa8; font-weight: 700; flex-shrink: 0; }
    .sn-sib-grid a:hover { color: #1e5fa8; }

    /* モバイル */
    @media (max-width: 700px) {
      .sn-siblings { margin-top: 28px; padding: 18px 16px 4px; }
      .sn-sib-grid { grid-template-columns: 1fr; }
      .sn-sib-hub { margin-left: 0; }
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

    /* 印刷時は共通ヘッダー・パンくずを除外（本文だけ印刷） */
    @media print {
      .sn-header, .sn-crumb, .sn-siblings { display: none !important; }
    }
  `;

  // ── HTML 構築 ──
  // 事務スタッフ向け（jimu）はナビに出さない（項目過多回避。トップカード・検索・パンくずで到達できる）
  const navItems = [
    { cat: 'home', label: 'ホーム' },
    { cat: 'kaitei', label: '改定資料' },
    { cat: 'kasan', label: '算定項目まとめ' },
    { cat: 'checklist', label: 'チェックリスト' },
    { cat: 'tools', label: 'ツール' },
    { cat: 'knowledge', label: 'ナレッジ' },
    { cat: 'yakureki', label: '薬歴' },
  ];

  const navHtml = navItems
    .map(
      (n) =>
        `<a href="${u(CATEGORIES[n.cat].url)}" class="${
          category === n.cat ? 'sn-active' : ''
        }">${n.label}</a>`
    )
    .join('');

  // パンくず（ホーム以外で表示）
  let crumbHtml = '';
  if (!isHome && category) {
    const cat = CATEGORIES[category];
    // home 直下のページ（更新履歴・ページ一覧）は「ホーム › ページ名」の2段
    const isCategoryLanding = filename === cat.url || category === 'home';
    if (isCategoryLanding) {
      crumbHtml = `
        <nav class="sn-crumb" aria-label="パンくずリスト">
          <a href="${u('index.html')}">ホーム</a>
          <span class="sn-crumb-sep">›</span>
          <span class="sn-crumb-current">${category === 'home' ? pageInfo.title : cat.name}</span>
        </nav>`;
    } else {
      crumbHtml = `
        <nav class="sn-crumb" aria-label="パンくずリスト">
          <a href="${u('index.html')}">ホーム</a>
          <span class="sn-crumb-sep">›</span>
          <a href="${u(cat.url)}">${cat.name}</a>
          <span class="sn-crumb-sep">›</span>
          <span class="sn-crumb-current">${pageInfo.title}</span>
        </nav>`;
    }
  }

  const headerHtml = `
    <div class="sn-wrap">
      <header class="sn-header">
        <div class="sn-header-inner">
          <a href="${u('index.html')}" class="sn-logo">
            <img src="${getLogoPath()}" alt="Hello Group">
          </a>
          <nav class="sn-nav" id="sn-nav">${navHtml}</nav>
          <div class="sn-actions">
            <button class="sn-search-btn" id="sn-search-btn" aria-label="サイト内検索">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <span class="sn-search-label">資料を検索</span>
              <kbd>/</kbd>
            </button>
            <button class="sn-toggle" id="sn-toggle" aria-label="メニュー">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        </div>
      </header>
      ${crumbHtml}
    </div>
  `;

  // ロゴ画像のパス（サブディレクトリでもサイトルート起点で解決）
  function getLogoPath() {
    return u('assets/icons/会社ロゴ.png');
  }

  // ── favicon 自動注入（既に <link rel="icon"> がある場合はスキップ） ──
  if (!document.querySelector('link[rel="icon"]')) {
    const favicons = [
      { rel: 'icon', href: u('assets/icons/favicon.ico'), sizes: 'any' },
      { rel: 'icon', type: 'image/svg+xml', href: u('assets/icons/favicon.svg') },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: u('assets/icons/favicon.png') },
      { rel: 'apple-touch-icon', href: u('assets/icons/apple-touch-icon.png') },
    ];
    favicons.forEach((f) => {
      const link = document.createElement('link');
      Object.entries(f).forEach(([k, v]) => link.setAttribute(k, v));
      document.head.appendChild(link);
    });
  }

  // ── 共通・印刷レイアウト（assets/print.css）を全ページへ注入 ──
  // カード／ボックスで組んだページの印刷枚数を減らす。個別ページのインライン
  // @media print より後に読み込まれ、古い印刷指定を上書きする。
  // 除外：① checklist カテゴリ（印刷1枚に個別調整済みのため共通CSSを当てない）
  //       ② <meta name="sn-no-print-css"> を置いたページ（任意で個別に除外）
  const skipPrintCss = category === 'checklist' || document.querySelector('meta[name="sn-no-print-css"]');
  if (!skipPrintCss && !document.querySelector('link[data-sn-print]')) {
    const printCss = document.createElement('link');
    printCss.rel = 'stylesheet';
    printCss.media = 'print';
    printCss.href = u('assets/print.css');
    printCss.setAttribute('data-sn-print', '');
    document.head.appendChild(printCss);
  }

  // ── 検索エンジン非掲載（社内専用サイト）：全ページに noindex を注入 ──
  // 既に <meta name="robots"> があるページはスキップ（個別指定を尊重）
  if (!document.querySelector('meta[name="robots"]')) {
    const robots = document.createElement('meta');
    robots.setAttribute('name', 'robots');
    robots.setAttribute('content', 'noindex,nofollow,noarchive');
    document.head.appendChild(robots);
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

  // ── サイト内検索スクリプトを自動ロード ──
  // 見出しの索引（assets/search-index.js・約38KB）はここでは読まない。
  // 検索を初めて開いたときに site-search.js が読む（大半のページ表示では使わないため）。
  if (!document.querySelector('script[data-site-search]')) {
    const s = document.createElement('script');
    s.src = u('assets/site-search.js');
    s.defer = true;
    s.dataset.siteSearch = '1';
    document.head.appendChild(s);
  }

  // ── トップへ戻るFABを自動ロード ──
  if (!document.querySelector('script[data-site-fab]')) {
    const s = document.createElement('script');
    s.src = u('assets/site-fab.js');
    s.defer = true;
    s.dataset.siteFab = '1';
    document.head.appendChild(s);
  }

  // ── 最近見たページ（履歴記録＋index描画）を自動ロード ──
  if (!document.querySelector('script[data-site-recents]')) {
    const s = document.createElement('script');
    s.src = u('assets/site-recents.js');
    s.defer = true;
    s.dataset.siteRecents = '1';
    document.head.appendChild(s);
  }

  // ── 同じカテゴリーの他のページを本文の最後に置く ──
  // フォーラムのリンクから個別ページに直接来る人が大半で、読み終えたあとの
  // 行き先がヘッダーのナビしかなかった（2026-08-06 のアクセス解析で判明）。
  // PAGES から作るので、ページ側の追記は要らない。
  function buildSiblings() {
    if (!category || category === 'home') return;      // トップ・更新履歴・ページ一覧には出さない
    const cat = CATEGORIES[category];
    if (!cat || filename === cat.url) return;          // まとめページ自身には出さない（既に全部並んでいる）
    if (document.querySelector('.sn-siblings')) return;

    const siblings = Object.entries(PAGES).filter(
      ([file, info]) => info.category === category && file !== filename && file !== cat.url
    );
    if (siblings.length < 2) return;

    const nav = document.createElement('nav');
    nav.className = 'sn-siblings';
    nav.setAttribute('aria-label', '同じカテゴリーのページ');
    nav.innerHTML =
      '<div class="sn-sib-head">' +
      `<span class="sn-sib-title">${esc(cat.name)}の他のページ</span>` +
      `<a class="sn-sib-hub" href="${encodeURI(u(cat.url))}">まとめページへ ›</a>` +
      '</div><div class="sn-sib-grid">' +
      siblings
        .map(([file, info]) => `<a href="${encodeURI(u(file))}">${esc(info.title)}</a>`)
        .join('') +
      '</div>';

    // ページ末尾のフッターがあればその手前に置く（フッターより下に出さない）
    const foot = document.querySelector('body > footer, body > .page-foot');
    if (foot) foot.parentNode.insertBefore(nav, foot);
    else document.body.appendChild(nav);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildSiblings);
  } else {
    buildSiblings();
  }
})();
