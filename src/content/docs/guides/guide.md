---
title: 機能ガイドブック
description: 全 21 PM アクション・バックエンド切替・安全モード・運用ユーティリティの全容
---

# AGENT_PM 機能ガイドブック

`agent-pm` は AI エージェントにプロジェクト管理（PM）の全責務を委ねるシステムです。「PR 作成（自己進化）」はその一面に過ぎません。本ガイドは **計画・分解・追跡・分析・報告・課題発見** 等、PM の仕事をすべて網羅します。

> 統一文法: `python agent-pm.py <ai-tool> PM <action> [options]`
> AI とプラットフォームの差異はシステムが隠蔽。利用者は「何をしたいか」だけ表現します。

---

> 初回起動・セットアップ手順は [クイックスタート](/agent-pm-docs/getting-started/) にまとめています。本ガイドは**機能の全容**を網羅します。

---

## 1. PM アクション一覧（21種 + wp_bulk エイリアス）

### 📋 計画・分解
| action | 役割 | 例 |
|---|---|---|
| `計画作成` / `タスク作成` | 機能からIssueを計画生成 | `PM 計画作成 --feature="認証機能" --duration=2weeks` |
| `タスク分解` | 機能をタスク単位に分解 | `PM タスク分解 --feature="決済導入"` |
| `見積もり` | タスク工数を見積もり | `PM 見積もり --feature="API改修"` |
| `起動` | PM モード起動・アクティブIssue一覧 | `PM 起動` |

### 📊 追跡・更新
| action | 役割 | 例 |
|---|---|---|
| `ガント更新` | コミット履歴から進捗更新・構造化リンクで自動クローズ | `PM ガント更新 --from-commits=7days` |
| `マイルストーン` | マイルストーン一覧 | `PM マイルストーン` |
| `依存関係` | タスク依存関係を可視化 | `PM 依存関係` |
| `実績記録` | タスクの実績工数を記録（予測精度の学習データ） | `PM 実績記録 --task-id="#42" --hours=6` |
| `実績回収` | closed issue のコメントから実績工数を回収 | `PM 実績回収 --project=agent_pm_self` |

### 📈 分析・報告
| action | 役割 | 例 |
|---|---|---|
| `スタンドアップ` | デイリースタンドアップ要約 | `PM スタンドアップ` |
| `進捗確認` | 進捗レポート | `PM 進捗確認` |
| `レポート` | 包括レポート | `PM レポート --mode=weekly` |
| `リスク分析` | 遅延・ブロッカーのリスク分析 | `PM リスク分析` |
| `デイリーレビュー` | 毎日の総合レビュー（運用環境の pm-cron が自動実行） | `PM デイリーレビュー` |
| `リソース` | 人員・割当のリソース分析 | `PM リソース` |
| `ドキュメント` | ドキュメント整備状況の分析 | `PM ドキュメント` |
| `予測` | Predictive Intelligence（見積もり精度・リスク予測・バイアス補正） | `PM 予測` |

### 🔍 課題管理・レビュー
| action | 役割 | 例 |
|---|---|---|
| `課題発見` | コードの TODO/FIXME・GOAL 残課題・停滞Issue をスキャンし**未追跡の課題を自動Issue化**（重複回避） | `PM 課題発見` |
| `レビュー起票` | PR レビューを `reports/` にプレビュー生成（実投稿はオプトイン） | `PM レビュー起票 --pr-number=123` |

### 🤖 自律実行（EXECUTE ループ）
| action | 役割 | 例 |
|---|---|---|
| `自律実行` | 依存解決済み（ready）の追加型タスクを最若番で選出→LLM 生成の実装（docs/test 作成等）→テストゲート→PR→自動マージ→Issue close。コード編集は扱いません | `PM 自律実行 --auto-dev --project=default` |

### 📝 WordPress 一括操作（wp_bulk エイリアス・`utils/wp_bulk_tools.py`）
`wp_bulk_create` / `wp_bulk_create_posts`（create）・`wp_bulk_sync` / `wp_bulk_sync_posts`（sync）。

> **PLAN → EXECUTE ループ**: `計画作成`/`見積もり` で積んだタスクを、`依存関係` から依存グラフを構築しクリティカルパス算出→milestone の due_on 逆算・`phase:N`/`status:ready` ラベル後付け（`scripts/schedule_tasks.py`）し、ready なタスクから `自律実行` が連続的に片付けます（北極星＝全自動開発）。詳しくは [概要](/agent-pm-docs/) の「依存スケジューリング + 自律実行（EXECUTE ループ）」節。

### 🔑 用語集（初めて読む人向け）

| 用語 | 意味 |
|---|---|
| **北極星** | 最終目標「AI による全自動開発」 |
| **L0-L3** | 憲章のメタ階層。L3 = 実装・テスト層。**L3 自己進化** = LLM が自分のコード・ドキュメントを改善するループ |
| **additive（追加型）** | 既存を壊さない追加のみの変更。Phase A では `create_doc`（新規 `docs/**/*.md`）/ `append_to_section` / `add_test_method` の 3 操作のみ |
| **smoke と EXECUTE の違い** | smoke（`smoke_test.py`）= 課題 issue なしで無差別に docs 改善を生成。EXECUTE（`auto_execute.py`）= 見積もり済みタスク issue を 1 件選出して実装。どちらも対象リポに PR を出す |
| **target-repo auto-merge（対象リポ自動マージ）** | ① 運用中の自動マージ。EXECUTE/smoke が**対象リポジトリ**（`config.projects.*.repository`）に開いた PR を `scripts/pr_policy.py` がマージ。「自動マージ導入済み」は常にこちら |
| **self-repo auto-merge（自己リポ自動マージ・未導入）** | ② agent-pm **本体リポ**への PR を AI が自分でマージする機能。**未導入・未実装**（人間承認必須） |
| **Dogfooding Phase 1-3** | 自己進化の対象範囲を段階拡大する計画。Phase 1 = サブモジュールの docs のみ（現行） |
| **EXECUTE Phase A/B** | EXECUTE ループの自動マージ範囲の段階。Phase A = additive のみ（現行）・Phase B = コードタスク（人間承認待ち）。**Dogfooding Phase とは別系列** |

ドキュメントの「自動マージ」は特に断りがなければ target-repo auto-merge（①）を指します。

---

## 2. AI バックエンド（config 駆動・切替自在）

| kind | バックエンド | 備考 |
|---|---|---|
| `claude_code` | ローカル Claude Code CLI（`claude -p`） | **コミット済み既定**・API キー不要。`system.default_ai_tool` がこの kind |
| `anthropic` | Claude（API 専用 / z.ai GLM proxy 対応） | `ANTHROPIC_AUTH_TOKEN` で proxy 経路。CLI 経路は `claude_code` kind |
| `google` | Gemini（google-genai SDK: テキスト/ストリーミング/マルチモーダル） | `generation_config` で temperature/top_p・`thinking_level`（Gemini 3.x 推論強度）調整可 |
| `openai_compat` | OpenAI 互換（MiniMax/DeepSeek/Ollama/vLLM 等） | `base_url` 追記だけで追加・新handler不要 |
| `cli` | CLI エージェント（Antigravity `agy` / aider 等） | APIキー不要・CLI が自己認証 |

```bash
python agent-pm.py gemini PM ガント更新 --project=default   # gitlab/ado は local config の projects.* で定義
python agent-pm.py minimax PM デイリーレビュー   # config追記のみで切替
python agent-pm.py antigravity PM スタンドアップ  # agy CLI バックエンド（要: `agy install`。config は既定で有効）
python agent-pm.py auto PM デイリーレビュー       # provider を config から解決（下記）
```

**`auto` センチネル**: `<ai-tool>` に `auto` を指定すると、プロバイダーを **config から解決** します（`projects.<name>.ai_tool` → `system.default_ai_tool`）。cron 等の定期実行は `auto` を呼ぶだけで、実際のバックエンドは設定変更のみで切り替えられ、単一の（期限切れしうる）プロバイダーを YAML に硬编码しません。`system.default_ai_tool` の既定は `claude_code`（ローカル Claude Code CLI）。

詳細な設定項目は [LLMバックエンド](/agent-pm-docs/guides/llm-backend/) へ。

## 3. プラットフォーム（3x3 マトリクス）
GitHub / GitLab / Azure DevOps — 各 CLI / API フォールバック両対応。`--project=<name>` で切替（config の `projects.*` で定義）。

---

## 4. 安全モード（review-before-merge gate）

| モード | 挙動 |
|---|---|
| (既定) | **書込action**（ガント更新/計画作成/課題発見 等）は自動 **PREVIEW** — 提案は `reports/preview_log.jsonl` に記録・**実行しない** |
| `--auto-dev` | 書込action を直接実行（従来挙動・opt-in） |
| `--preview` | 全 action で提案を記録のみ（明示） |
| `--dry-run` | 固定モック応答・副作用なし（APIキー不要・実LLM呼ばない） |

読取action（レポート/マイルストーン 等）は常に直接実行。**破壊的操作は許可リストで拒否**（`gh repo delete` / `rm` 等）。

`scripts/` 直叩き（`smoke_test.py` / `auto_execute.py`）も同じ opt-in 規則です（既定 = **local-only** — 実LLM改善→適用→テストゲートまで。push/PR/Issue/マージ **なし**）:

**呼び出し方法 × 既定挙動の対照表**（「同じプロダクトで既定が 3 通り」の全体像）:

| 呼び出し方法 | 何も付けない既定 | 実行/公開 | モック |
|---|---|---|---|
| `python agent-pm.py … PM <action>` | 書込 action は **PREVIEW**（提案を `reports/` に記録のみ） | `--auto-dev` | `--dry-run` |
| `python scripts/smoke_test.py` 等 直叩き | **local-only**（改善生成〜テストゲートまで・push/PR なし） | `--auto-dev` | `--dry-run` |
| `make smoke` / `make execute` | **`--auto-dev`**（手順用途・公開まで実行） | （既定で公開側） | `DRY=1`・`SAFE=1` で local-only |

> `make` のみ既定が公開側（`--auto-dev`）なのは、cron・手順化された運用用途を想定しているためです（`SAFE=1` で local-only・`DRY=1` でモック）。初めて試す場合は `scripts/` 直叩きか `make smoke SAFE=1` を。

---

## 5. 運用ユーティリティ（`scripts/`）

| スクリプト | 役割 |
|---|---|
| `smoke_test.py` | 汎用 repo-improvement エンジン — LLM が additive 改善を生成→テスト→（**既定はここで停止**・push/PR なし）。`--auto-dev` で PR→自動マージ（L3 自己進化で使用） |
| `e2e_live.py` | 実 LLM E2E 検証（13 actions × N providers、プラットフォーム stub） |
| `sim_live.py` | self-contained LLM シミュレーション（人間/カレンダーギャップを閉じる） |
| `pm_gitflow.py` | branch→commit→rebase→push→PR の安全な git ワークフロー |
| `pm_validate.py` | ダブルチェック合議（recall重視＋precision重視の2パス、consensusのみ自動クローズ） |
| `woodpecker_observe.py` | CI/cron 観測（SQLite 経路で token 不要・GitHub status API 併用） |

```bash
python scripts/pm_validate.py double --provider claude --workdir /path/to/repo
python scripts/woodpecker_observe.py --sqlite   # cron 発火結果を token 無し観測
```

**make で実行**（`smoke` / `execute` は手順用途のため既定 = `--auto-dev`）。スクリプトが実行前にモードバナーを出すので、説明なくいきなり動くことはありません:

```bash
make smoke            # 自己進化を実行（--auto-dev: PR発行→自動マージ）
make smoke SAFE=1     # local-only（PR/マージなし・安全な味見）
make smoke DRY=1      # モック（APIキー不要）
make execute          # EXECUTE ループ: ready タスクを実装→PR→自動マージ
make execute PROJECT=default   # 対象プロジェクトを指定
```

---

## 6. 自動化・定期実行（Woodpecker CI / cron）

開発元環境では Woodpecker CI の cron パイプラインが自動化を駆動します
（自分の clone では**一切走りません**）:

- **CI**: push/PR で unittest 実行・GitHub に commit status 投稿
- **pm-cron** (平日 00:00・サーバ時刻): デイリーレビューを自動実行（読取専用・レポート+Slack）
- **smoke-cron** (火/木 03:00): サンプルリポジトリへの L3 自己進化（改善→PR→自動マージ＝target-repo auto-merge）
- **execute-cron** (月水金 03:30): EXECUTE ループ — ready な additive タスクを選出→実装→PR→自動マージ（`ai:executing` ラベルで smoke-cron と排他・用語は §1 用語集）
- **pm-event** (pull_request / push(main) / manual): PR レビュー起票（`--preview`）・main push のリスク分析
- **pm-weekly** (月 06:30): 週次レポート生成
- **e2e-cron** (毎日): 本番 API E2E（`e2e_live.py`）
- **analytics-cron** (毎日): 予測精度の経年分析・収束検証
- **schedule-smoke / projects-sync / sync-dates** (毎日): スケジューラ smoke・Projects v2 同期・ガント日付同期
- **release**: tag push で GitHub Release を自動生成（VERSION↔tag 整合検証付き）

---

## 7. 関連ドキュメント

セットアップの最小手順は [クイックスタート](/agent-pm-docs/getting-started/)、認証・スコープ・権限の可否は [認証と権限](/agent-pm-docs/guides/auth/)、設定パターン（初回クローン / 本番 / 独自リポ / 上書き）は [設定パターン](/agent-pm-docs/guides/config-patterns/) にまとめています。

- `.env` は起動時に**自動読込**（shell 環境変数が優先・CI は no-op）
- バックエンド（Claude / Gemini / MiniMax / CLI 等）の切替は [LLMバックエンド](/agent-pm-docs/guides/llm-backend/)
- システムの構成は [システム設計](/agent-pm-docs/guides/architecture/)
