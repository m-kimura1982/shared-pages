# 調剤報酬・薬歴まとめ

調剤薬局スタッフ向けに、調剤報酬（2026年改定）の資料と薬歴マニュアルをまとめた社内サイト。

- 公開先: https://m-kimura1982.github.io/shared-pages/
- 全ページ noindex（検索には出さない。社内で URL を共有して使う）
- HTML + CSS のみ。フレームワーク・ビルド不要

## フォルダの役割

| 場所 | 中身 |
|---|---|
| ルート直下 | 各カテゴリの入口ページ（index / 加算まとめ / checklists / kaitei2026 / tools / knowledge / 事務スタッフ向け / updates）と 404.html |
| `加算まとめ/` `チェックリスト/` `改定資料/` `ツール/` `ナレッジ/` `事務/` | 上の入口にぶら下がる個別ページ |
| `yakureki/` | 薬歴マニュアル（入口の index.html もこの中） |
| `assets/` | 共通の js / css、ページ一覧データ、用語ルール |
| `assets/icons/` | favicon・会社ロゴ |
| `files/` | 厚労省通知などの原本PDF |
| `draft/` | 未公開の下書き。公開ページからリンクしない |
| `tools-internal/` | 公開しない内部スクリプト・試作 |

**新しいページはルート直下ではなく、該当するカテゴリのフォルダに置く。**
置いたあと `assets/site-header.js` のページ一覧に1行登録すると、サイト内検索・パンくずに出る。

## ローカルで見る

```bash
npx serve . -p 3000
```

http://localhost:3000 で確認できる。

## 公開

Claude Code の `/公開` を使う。更新履歴の反映・更新バッジの再生成・push までまとめて行う。
手動でやる場合は、ページをコミット → `node assets/build-page-meta.js` → 生成物をコミット → push の順。
（`build-page-meta.js` は git のコミット日から更新日を読むので、この順番でないと日付がずれる）

## 作業ガイド

- `CLAUDE.md` … サイト構成・デザインルール・文章ルール。**編集前に読む**
- `AGENTS.md` … Codex 用。構成図は古いので `CLAUDE.md` が正
