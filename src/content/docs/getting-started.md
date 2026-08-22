---
title: クイックスタート
description: agent-pm を 5 分で動かすための最小手順
---

# クイックスタート（5分で動かす）

agent-pm を初めて動かすための最小手順。機能の全容は [機能ガイドブック](/agent-pm-docs/guides/guide/) へ。

> 統一文法: `python agent-pm.py <ai-tool> PM <action> [options]`

---

> **安全設計（オプトイン）**: clone しても**自動化は一切動きません**。定期実行（cron）は開発元環境の CI 専用で、自分の clone では走りません。書込のある操作はすべて既定で安全モードで、明示的に `--auto-dev` を付けた時のみリモートへ公開します（インターフェース毎の既定対照表は [機能ガイドブックの安全モード節](/agent-pm-docs/guides/guide/)）。

## Step 1: モックで試す（APIキー不要）

前提: **Python 3.11+** と **PyYAML** のみ（`pip install pyyaml`）。`python` が無い環境は `python3` で。

```bash
python3 agent-pm.py claude PM スタンドアップ --dry-run
```

`--dry-run` は固定モック応答（実LLMを呼ばない・副作用なし）。レポート形式を手元で確認できます。

> この時点でサブモジュールを未取得の場合、`no persona found` / `Agent role file not found` の警告が出ますが動作に支障はありません（Step 2 の `git submodule update` で解消されます）。

## Step 2: 実データで使う（最小セットアップ）

```bash
pip install -r requirements.txt
git submodule update --init --recursive
cp .env.template .env   # APIキー・トークンを記入
make init-concept-sync  # .concept/ ランタイム状態を初期化（初回クローン後に必須）
make setup-hooks        # 共有 pre-commit / commit-msg フックを有効化
```

- 実LLMは**既定バックエンド `claude_code`（ローカル Claude Code CLI）なら API キー不要**。API 経路（`claude` 引数 = Anthropic API）で使う場合のみ `.env` に `ANTHROPIC_API_KEY` を設定
- **GitHub 認証は読取系アクションにも必要**（issue/PR の取得のため）: `gh auth login`（gh CLI ログイン）または `.env` に `GITHUB_TOKEN` を設定。未認証のまま `--dry-run` なしで実行すると `HTTP 401` で失敗します（実行時に `gh auth login` が案内表示されます）。認証方法の選択・必要スコープ・「他人のリポで何ができるか」の可否表は [認証と権限](/agent-pm-docs/guides/auth/)
- proxy（z.ai GLM 等）は `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_BASE_URL`
- `.env` は起動時に自動読込（shell の環境変数が優先）

管理対象リポジトリは `config/agent_pm_config.yaml` の `projects`。自分のリポを追加する場合は `config/agent_pm_config.local.yaml`（`.gitignore` 対象）:

```yaml
projects:
  my_project:
    platform: "github"
    repository: "YOUR_OWNER/YOUR_REPO"
    ai_tool: "claude"
```

## Step 3: よく使うアクション

```bash
# 読取系（安全・常に直接実行）
python agent-pm.py claude PM スタンドアップ           # 今日の状況サマリ
python agent-pm.py claude PM デイリーレビュー          # 総合レビュー

# 実LLMを API キーなしで使うなら auto（config の既定 = ローカル Claude Code CLI）
python agent-pm.py auto PM スタンドアップ

# 書込系（既定で PREVIEW = 提案を記録のみ・実行しない）
python agent-pm.py claude PM ガント更新               # 提案を reports/ で確認
python agent-pm.py claude PM ガント更新 --auto-dev    # 提案を直接実行
```

## 次のステップ

- [認証と権限](/agent-pm-docs/guides/auth/) — 認証方法（gh CLI / PAT）・必要スコープ・権限×機能の可否表
- [ガント可視化](/agent-pm-docs/guides/gantt-visual/) — ガント（Roadmap）ビューの初回設定をスクリーンショットで解説
- [機能ガイドブック](/agent-pm-docs/guides/guide/) — 全 21 アクション・バックエンド切替・安全モード・運用ユーティリティの全容
- [設定パターン](/agent-pm-docs/guides/config-patterns/) — 設定パターン（初回クローン / 本番 / 独自リポ / 上書き）の詳細
- [概要](/agent-pm-docs/) — プロジェクト概要・EXECUTE ループ（自律実行）・ガントチャート可視化
