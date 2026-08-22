# agent-pm-docs

[agent-pm](https://github.com/co-priv4) の**マニュアル・概要を公開する**ドキュメントサイト
（Astro + Starlight / GitHub Pages）。

- 公開 URL: https://co-priv4.github.io/agent-pm-docs/
- 公開対象: 概要（README 縮約）+ ユーザーマニュアル（クイックスタート / 機能ガイドブック /
  認証と権限 / ガント可視化 / 設定パターン / LLM バックエンド / システム設計）
- **コード・内部運用ドキュメントは含まない**（本体リポジトリは非公開）

## 同期方針

本リポジトリのコンテンツ（`src/content/docs/`）は本体リポジトリ `docs/*.md` を起源とする
**手動同期の抄録版**です。本体側のドキュメントを更新したら、該当ページをこのリポジトリへ
反映してください（内部リンクは `/agent-pm-docs/...` 形式に置換済み）。

## 開発

```bash
pnpm install
pnpm dev       # http://localhost:4321/agent-pm-docs/
pnpm build     # dist/ へビルド
```

## デプロイ

`main` への push で GitHub Actions が自動ビルドし GitHub Pages へ公開する
（`.github/workflows/deploy-docs.yml`）。手動発火は workflow_dispatch から。
