# 調剤報酬まとめ サイト - Claude 作業ガイド

このファイルは別PCでの作業引き継ぎ用です。Claude Code がこのディレクトリを開いたとき自動的に読み込まれます。

## サイト概要

- **サイト名:** 調剤報酬まとめ
- **GitHub Pages URL:** https://m-kimura1982.github.io/shared-pages/
- **リポジトリ:** D:\☆shared-pages\（このフォルダ）
- **作業者:** 調剤薬局スタッフ（情報管理室・木村）
- **目的:** 2026年調剤報酬改定の資料・ツールをスタッフ向けにまとめて公開

## サイト構造

```
index.html          ← ホームページ（ヒーロー・コンテンツ一覧・おすすめ・更新情報）
├── kaitei2026.html ← 2026改定 資料一覧
│   └── 各加算・管理料の個別ページ（「← トップに戻る」リンク → kaitei2026.html）
└── tools.html      ← 実務ツール集
    └── gigi-search.html、届出判定ツール、別表１（１）など
```

## デザインルール（厳守・2026-06-02 刷新版）

> **旧ルール（`--blue-light` / `--sub` / `--bg:#f5f7fa` 等）は廃止。** 新規ページ・既存改修はすべて下記に従う。
> 刷新済みリファレンス実物：`選定療養_概要2026.html` / `調剤時残薬調整加算.html` / `薬学的有害事象等防止加算.html` / `在宅薬学総合体制加算2026.html` / `在宅薬学総合体制加算2イ_特例摘要欄ガイド.html`（`調剤報酬QA.html` は**作成中**のため対象外）

- フォント: Noto Sans JP（Google Fonts、weight 400/500/700/900）
- フレームワーク不使用 - 純粋な HTML + CSS のみ
- レイアウト: `.page`（max-width:900px）に `.card` を縦積み

### 配色と役割（最重要）

| 色 | 変数 | 役割 |
|----|------|------|
| 青 `#1e5fa8` | `--blue` | メイン。**変化・新規**、H2/H3マーカー、`.em-change` |
| 黄マーカー `#fff59d` | `.marker` | 本文で**読ませたい箇所**のアンダーライン |
| アンバー `#b45309` 系 | `--amber` / `--amber-bg:#fdf0e3` / `--amber-bd:#e8c9a3` | **最終手段。青・グレー・黄マーカーで区別しきれない時だけ使う**（後述） |
| 赤 `#cc0000` | `--red`（定義は残してよい） | **使わない** |
| グレー文字 | `--txt-2:#444444` / `--txt-3:#5e6470` | 補助テキスト。**薄すぎ厳禁**（#999以下は「・」等の弱い記号のみ） |

**役割分担の原則：** 基本は **青（変化・新規／強調）＋黄マーカー（読ませたい）＋補助グレー** の3役だけで構成する。注意喚起や制約も、まずこの3役と罫線・余白・「×」印で表現する。

**アンバーは「最終手段」：** 上記3役＋グレーでは**意味の区別がどうしてもつかない時だけ**使う色。下記をすべて満たす場合に限る。
- 同一画面に**並列する2系統以上**があり、一方が「気をつける側／制約のある側」だと**色で対比しないと伝わらない**（例：残薬調整の「パターン1＝青／パターン2＝アンバー」の対比、box-amber の制約ボックス）。
- **赤の代わりとして単発の注意に使うのは不可**（注意喚起＝赤という発想自体を捨てる）。
- **NG・不可はアンバーで表さない**（注意と混同するため）。中立グレー＋「×」印で表す。
- **現在の新規ページは原則アンバーなしで作成する。** アンバーありの実装例は `調剤時残薬調整加算.html`（パターン対比・box-amber）が唯一のリファレンス。これに該当しない限り `--amber` 系は定義もしない。

### 配色の拡張：カテゴリ色（やむを得ない場合の例外）

**大原則は「色は極力抑える」**（メリハリで勝負・むやみに色を増やさない）。ただし、内容に**並列カテゴリ**があり、**色を使わないと階層・区分が区別できない**ページ（区分イ/ロ/ハ/ニ、分類別の箱など）に限り、**やむを得ず**上記3役とは別レイヤーの「分類用カテゴリ色」を使う。あくまで**例外であって推奨ではない**。色なしの手段（番号・ラベル・罫線・余白）で足りるなら色は足さない。

- 使う場合も彩度は抑える。例（残薬調整ページ）：`--grp-zaitaku:#1e5fa8`（在宅＝青）／`--grp-kakari:#6b5ea8`（かかりつけ＝紫）／`--grp-other:#5c6370`（その他＝グレー）
- カテゴリ色は「区別」のための色。強調（青）の意味とは別レイヤーとして扱い、混同させない。アンバーを併用する場合（残薬調整など）も、カテゴリ色／強調／アンバーを互いに混同させない。
- **「NG・不可」を示すときはアンバー（＝注意）と混同させない。中立グレー＋「×」印で表す**（残薬調整ページのNGケース参照）。
- リファレンス実装：`調剤時残薬調整加算.html`（やむを得ずカテゴリ色を使った例）
- 例外でカテゴリ色を使う場合も**赤は使わない**は不変。

### :root テンプレート

```css
*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
:root {
  --text-xs:13px; --text-sm:15px; --text-md:16px; --text-lg:18px; --text-xl:22px;
  --pad-card:22px; --gap-card:16px;
  --blue:#1e5fa8; --red:#cc0000; --ink:#222222;        /* --red は定義のみ・使用禁止 */
  --bg:#f3f4f6; --white:#ffffff;
  --box-blue:#e4f0f8; --box-gray:#f2f2f2;
  --border:#d1d5db; --border-dk:#9ca3af;
  --radius:10px; --radius-sm:6px; --bw:0.5px; --bw-h:1px; --bw-a:3px; --bw-t:4px;
  /* --amber 系は最終手段。原則は定義しない。残薬調整のようなパターン対比が必要な時だけ追加する */
  /* --amber:#b45309; --amber-bg:#fdf0e3; --amber-bd:#e8c9a3; */
  --txt-2:#444444; --txt-3:#5e6470;                    /* 補助テキスト。薄すぎ厳禁 */
}
body { font-family:"Noto Sans JP",sans-serif; background:var(--bg); color:var(--ink); font-size:var(--text-md); line-height:1.8; padding:32px 16px 60px; }
.page { max-width:900px; margin:0 auto; display:flex; flex-direction:column; gap:var(--gap-card); }
```

### 見出し階層

```css
/* H1：装飾なし・大きめ太字＋下にサブ説明 */
.page-title h1 { font-size:var(--text-xl); font-weight:900; letter-spacing:-0.01em; }
.page-title p  { font-size:var(--text-sm); font-weight:500; color:var(--txt-2); margin-top:4px; }
.card { background:var(--white); border:var(--bw) solid var(--border); border-radius:var(--radius); padding:var(--pad-card); }
/* H2：短い青縦棒＋下線。補足語 .qual は弱く、バッジは右寄せ */
.card-title { font-size:var(--text-lg); font-weight:900; border-bottom:var(--bw-h) solid var(--border-dk); padding-bottom:8px; margin-bottom:16px; display:flex; align-items:center; gap:11px; flex-wrap:wrap; }
.card-title::before { content:""; width:4px; height:1.05em; border-radius:2px; background:var(--blue); flex-shrink:0; }
.card-title .qual  { font-size:var(--text-sm); font-weight:700; color:var(--txt-3); }
.card-title .badge { margin-left:auto; }
/* H3：小さな青い四角（.sub-title / .section-title 同形） */
.sub-title { font-weight:900; font-size:var(--text-md); display:flex; align-items:center; gap:9px; margin-bottom:10px; }
.sub-title::before { content:""; width:9px; height:9px; border-radius:2px; background:var(--blue); flex-shrink:0; }
```

### 強調・ボックス・バッジ

```css
.em-change { color:var(--blue); font-weight:900; }                                   /* 変化・新規＝青太字 */
.marker    { background:linear-gradient(transparent 62%, #fff59d 62%); font-weight:700; } /* 読ませたい＝黄マーカー */
/* 変更バッジ：青＝変化／アンバー＝厳格化（注意）。赤は使わない */
.change-badge        { background:var(--box-gray); color:var(--txt-2); font-size:var(--text-xs); font-weight:700; padding:2px 10px; border-radius:4px; }
.change-badge.up,
.change-badge.new    { background:var(--box-blue); color:var(--blue); }
.change-badge.strict { background:var(--amber-bg);  color:var(--amber); }
/* ボックス */
.box-blue  { background:var(--box-blue); border-radius:var(--radius-sm); padding:14px 18px; }
.box-gray  { background:var(--box-gray); border:var(--bw) solid var(--border); border-radius:var(--radius-sm); padding:14px 18px; }
.box-amber { background:var(--amber-bg); border:var(--bw-h) solid var(--amber-bd); border-radius:var(--radius-sm); padding:13px 16px; }  /* 注意・制約 */
.box-amber .ttl { font-weight:900; color:var(--amber); margin-bottom:5px; font-size:var(--text-sm); }
.box-warn  { background:#fff8e1; border:1px solid #e5c200; border-radius:var(--radius-sm); padding:14px 18px; }
/* 箇条書きの「・」はグレーにしてH3の青四角と区別 */
.bullet { display:flex; gap:6px; }
.bullet > span:first-child { flex-shrink:0; color:#999; }
```

※ `@media (max-width:640px)` でフォント・余白を縮小、`@media print` で印刷最適化を付ける（リファレンスページの末尾を踏襲）。

### 番号バッジ（順序＝四角／ケース＝◯で形を分ける）
- 順序のある手順（STEP1→2→3 等）＝**青地・白文字の角丸四角バッジ**（26px / radius 7）。塗りつぶしは引き算流儀の例外だが、順序性を示す手順では正当。
- 既存の**ケース番号は黒丸◯**（`.pat-num`）で使用中。ステップは四角にして役割の衝突を避ける。
- 順序のない強調に塗りバッジは使わない。

## 個別ページの必須要素

### 共通ヘッダー（site-header.js）※手動の戻るボタンは付けない
`<body>` 直後に下記を入れると、共通ヘッダー・パンくず・favicon が自動注入される。**手動の「← トップに戻る」ボタンは置かない**（site-header.js が担うので、付けると二重になる）。
```html
<script src="assets/site-header.js" defer></script>
```

### GoatCounter（bodyタグ閉じる直前）
```html
<script data-goatcounter="https://kimura-chozai.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
```

## デプロイ方法

### 手動（確実）
```bash
cd "D:/☆shared-pages"
git add ファイル名.html
git commit -m "コミットメッセージ"
git push
```

### 一括（HTML全部）
```bash
cd "D:/☆shared-pages"
git add "*.html"
git commit -m "メッセージ"
git push
```

### 更新後に必須：更新バッジの再生成
ページを push したら**必ず** page-meta を再生成してコミットする（忘れると「X日前更新」が古いまま残る）。
```bash
cd "D:/☆shared-pages"
node assets/build-page-meta.js
git add assets/page-meta.json assets/page-meta.js
git commit -m "page-meta 再生成"
git push
```

## git 初回セットアップ（別PCの場合）
```bash
git config --global credential.helper manager
git config --global user.name "m-kimura1982"
git config --global user.email "m-kimura1982@users.noreply.github.com"
git config --global --add safe.directory 'D:/☆shared-pages'
```

## ローカルプレビュー
```bash
npx serve "D:/☆shared-pages" -p 3000
# → http://localhost:3000
```

## 公開ルール
- git push したら「チェックしてください」と伝える
- ユーザーが「公開お願いします」と言ったら push する
- `.claude/` の設定ファイル（settings.local.json, launch.json）はコミットしない

## 薬歴マニュアル プロジェクト（**非公開作業中**）

**現状：** `draft/yakureki/` 配下で開発中。完成まで非公開。

**非公開化の3層構造：**
1. `robots.txt` で `/draft/` を Disallow
2. 各HTMLの `<head>` に `<meta name="robots" content="noindex,nofollow,noarchive">`
3. index.html・kaitei2026.html・tools.html・updates.html から `draft/` への導線は作らない（**厳守**）

**ファイル名は日本語で運用**（サブフォルダ隔離なので視認性優先）：
`draft/yakureki/基本記載ルール.html`, `生活像.html`, `継続的な管理.html`, `加算別記載一覧.html`, `個別指導指摘事項.html`, `テンプレート集.html` 等。入口のみ `index.html`。
公開時は `git mv draft/yakureki yakureki` 一発でフォルダ昇格できる設計。

**薬歴10項目（ア〜オ）：** 令和8年3月5日保医発0305第4号 別添3（2026年改定）
原典：`別添3_調剤報酬点数表に関する事項2026.html`「薬学管理料 通則(4)(5)(6)」
- ア 基礎情報／イ 処方・調剤内容／ウ 患者情報（(イ)〜(ヘ)）／エ 継続的な薬学的管理及び指導の留意点／オ 薬剤師氏名
- 葉ノード合計10 ＝「10項目」

**重要：** 通則(5)「定型文を用いて画一的に記載するのではなく」→ テンプレ集ページには免責ボックスを必ず入れる。

**個人情報：** 載せない。原資料に誤って含まれていた場合は削除する。

詳細は memory `project_yakureki.md` 参照。

## 公開済みページ数（2026-04-17 時点）
- 構造ページ: 3（index, kaitei2026, tools）
- ツール: 3（疑義解釈検索、届出判定、別表１（１））
- 個別ページ: 約35ページ

詳細は `git ls-files "*.html"` で確認。
