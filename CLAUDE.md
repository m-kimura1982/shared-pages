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

## デザインルール（厳守）

- フォント: Noto Sans JP（Google Fonts）
- フレームワーク不使用 - 純粋な HTML + CSS のみ
- CSS カスタムプロパティ:
  - `--blue: #1e5fa8`（メインカラー）
  - `--blue-light: #e8f0fb`（薄青背景）
  - `--ink: #222222`（テキスト）
  - `--sub: #666666`（補助テキスト）
  - `--border: #d8dde8`（ボーダー）
  - `--white: #ffffff`
  - `--bg: #f5f7fa`（ページ背景）
  - `--radius: 10px`（角丸）

## 個別ページ（加算・管理料資料）の CSS テンプレート

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --text-xs: 13px; --text-sm: 15px; --text-md: 16px;
  --text-lg: 18px; --text-xl: 22px;
  --pad-card: 22px; --gap-card: 16px;
  --blue: #1e5fa8; --red: #cc0000; --ink: #222222;
  --bg: #f3f4f6; --white: #ffffff;
  --box-blue: #e4f0f8; --box-gray: #f2f2f2;
  --border: #d1d5db; --border-dk: #9ca3af;
  --radius: 10px; --radius-sm: 6px;
}
body { font-family:"Noto Sans JP",sans-serif; background:var(--bg); color:var(--ink); font-size:var(--text-md); line-height:1.8; padding:32px 16px 60px; }
.page { max-width:900px; margin:0 auto; display:flex; flex-direction:column; gap:var(--gap-card); }
```

## 個別ページの必須要素

### 戻るボタン（ページ最上部）
```html
<div style="padding: 4px 0 0;">
  <a href="kaitei2026.html" style="color:#1e5fa8;text-decoration:none;font-size:13px;border:1px solid #1e5fa8;border-radius:6px;padding:4px 14px;background:#fff;">← トップに戻る</a>
</div>
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

## 公開済みページ数（2026-04-17 時点）
- 構造ページ: 3（index, kaitei2026, tools）
- ツール: 3（疑義解釈検索、届出判定、別表１（１））
- 個別ページ: 約35ページ

詳細は `git ls-files "*.html"` で確認。
