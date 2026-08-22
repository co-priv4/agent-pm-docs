---
title: 設定パターン
description: 初回クローン / 本番 / 独自リポ / 上書きの 4 パターン動作仕様
---

# 設定ファイル別の動作パターン仕様

AGENT_PM システムは、コミット済みのデフォルト設定（`config/agent_pm_config.yaml`）と、ローカルで無視される独自設定（`agent_pm_config.local.yaml`）、および環境変数（`.env`）の組み合わせにより、主に以下の4つのパターンで動作します。

---

## 1. 動作パターンマトリクス

| パターン | 設定ファイル状態 | 環境変数 (`.env`) | 動作リポジトリ (`default`) | 動作モード | 主なユースケース |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. 初回クローン直後** | `agent_pm_config.yaml` のみ | 未設定 | デフォルト（サンプル） | `claude` CLI があれば実LLM / 無ければモック | 疎通確認・初期デモ |
| **2. デフォルト本番稼働** | `agent_pm_config.yaml` のみ | APIキー・トークン設定済み | デフォルト（サンプル） | 本番動作 (実API/LLM) | 既定のサンプルを用いた E2E 実動作検証 |
| **3. 独自プロジェクト追加** | `yaml` + `local.yaml` (追加設定) | APIキー・トークン設定済み | デフォルト（サンプル） | 本番動作 (実API/LLM) | `--project` 指定で自分のリポジトリを並行管理 |
| **4. 既定プロジェクト上書き**| `yaml` + `local.yaml` (上書き設定) | APIキー・トークン設定済み | ユーザー指定リポジトリ (上書き) | 本番動作 (実API/LLM) | 引数なしで常に自分のリポジトリをデフォルト動作 |

> **「動作リポジトリ (`default`)」について**: デフォルト対象は agent-pm にサブモジュールとして同梱のサンプルリポジトリ（`config` の `projects.default.repository`）です。clone すれば確実に存在し、動作検証が完結する最小・安全な単位として選んでいます。自分のリポジトリを対象にする場合は `local.yaml` で上書きします（パターン 3/4）。

### AI バックエンド（`ai_tool`）の解決

`ai_tool` は `KIND_REGISTRY`（`handlers/__init__.py`）の 5 kind で解決されます:

| kind | バックエンド | 要件 |
| :--- | :--- | :--- |
| `claude_code` | ローカル Claude Code CLI（`claude -p`） | CLI セットアップのみ・API キー不要 |
| `anthropic` | Claude API（z.ai GLM proxy 対応） | `ANTHROPIC_AUTH_TOKEN` / `ANTHROPIC_BASE_URL` |
| `google` | Gemini（google-genai SDK） | `GEMINI_API_KEY` |
| `openai_compat` | OpenAI 互換（MiniMax / DeepSeek / Ollama 等） | `base_url` + API キー |
| `cli` | CLI エージェント（Antigravity `agy` / aider 等） | CLI セットアップのみ・API キー不要 |

解決順序は `<ai-tool>` 引数（`auto` 指定時）→ `projects.<name>.ai_tool` → `system.default_ai_tool`。
コミット済み既定では `system.default_ai_tool: "claude_code"`・`projects.default.ai_tool: "claude_code"`
（API キーなしで実 LLM 動作する最安全の初期値）。詳細は [機能ガイドブック §2](/agent-pm-docs/guides/guide/) / [LLMバックエンド](/agent-pm-docs/guides/llm-backend/)。

---

## 2. 各パターンの詳細仕様

### パターン 1: 初回クローン直後の状態 (Default & Simulation / CLI Fallback)
* **概要**: リポジトリを新しくクローンし、設定ファイルや環境変数を明示的に用意せずに起動したときの状態。
* **ファイル状態**:
  * `config/agent_pm_config.yaml` のみが存在。
  * `config/agent_pm_config.local.yaml` および `.env` は存在しない。
* **挙動**:
  * `agent-pm.py` はデフォルトの config からプロジェクト `default`（対象: デフォルトのサンプルリポジトリ、ロール: `pm`）をロード。
  * **APIキー（.env）がない場合でも**: ローカルの `claude` CLI（Claude Code）がセットアップされており、`ai_tool` に `claude_code`（`kind: claude_code`）を指定している場合（**コミット済み既定 config がまさにこの状態**）は、**シミュレーションに退化せず、実LLMモード（非シミュレーション）で動作**します。この場合、GitHubトークン（`GITHUB_TOKEN`）が環境にあれば、デフォルト対象リポジトリ（サンプル）が直接更新されます。
  * CLIモードが有効でなく、APIキーも存在しない場合は、自動的に **Simulation Mode** (シミュレーションフォールバック) で起動し、モック結果のみを出力します。

### パターン 2: デフォルトリポジトリでの実LLM本番稼働 (Default & Live API)
* **概要**: サンプルリポジトリを利用して、実API連携と実LLMによるPM動作を検証する状態。
* **ファイル状態**:
  * `config/agent_pm_config.yaml` が存在。
  * `.env` に有効な `ANTHROPIC_API_KEY` および `GITHUB_TOKEN` が設定されている。
* **挙動**:
  * `.env` の環境変数が展開され、実LLMの呼び出しと GitHub API への書き込み権限が有効化（`is_simulation = False`）される。
  * ターゲットリポジトリ（デフォルトのサンプル）に対して、Issue起票、タスク分解、PR作成、PRマージなどの実PM業務アクションが実行される。

### パターン 3: ユーザー固有プロジェクトの追加 (Custom Project Registration)
* **概要**: デフォルトの検証環境を残したまま、開発者が自身の管理する外部プロジェクトを登録・運用する状態。
* **ファイル状態**:
  * `config/agent_pm_config.local.yaml` を作成し、新たなプロジェクト（例: `my_project`）を追記。
* **YAML定義例 (`local.yaml`)**:
  ```yaml
  projects:
    my_project:
      platform: "github"
      repository: "my-username/my-private-repo"
      ai_tool: "claude"
      agent_role: "developer"  # 開発者ロールを指定
  ```
* **挙動**:
  * ロード時に `agent_pm_config.yaml` の内容と `local.yaml` の内容が再帰的にディープマージされる。
  * ユーザーが `--project=my_project` オプションを付与して起動すると、指定されたリポジトリおよびエージェント定義（対象リポ側の `.agents/developer.md`）に基づいて実業務が動作する。
  * オプションを省略した場合は、デフォルト設定（サンプルリポジトリ）が対象となる。

### パターン 4: 既定プロジェクトのローカル上書き (Default Project Override)
* **概要**: `--project` オプションを省略した際の動作対象リポジトリそのものを、ローカル環境でのみ自分の開発プロジェクトに置き換える状態。
* **ファイル状態**:
  * `config/agent_pm_config.local.yaml` 内で `default` キーの設定を記述し、上書きする。
* **YAML定義例 (`local.yaml`)**:
  ```yaml
  projects:
    default:
      repository: "my-username/main-development-repo"
      agent_role: "reviewer"  # デフォルト時の動作をレビュアーに変更
  ```
* **挙動**:
  * ディープマージにより、`agent_pm_config.yaml` にある `default` の repository と agent_role が上書きされる。
  * オプションなし（例: `python agent-pm.py claude PM デイリーレビュー`）で実行した場合でも、上書きされたユーザー自身の開発リポジトリと指定されたエージェント定義（対象リポ側の `.agents/reviewer.md`）が優先されて動作する。

---

## 3. 設定ロードの優先ロジック

1. **基本設定ロード**: `config/agent_pm_config.yaml` がベース辞書として読み込まれる。
2. **ローカル上書き**: `config/agent_pm_config.local.yaml` が存在する場合、ベース辞書に対して再帰的にマージ（ディープマージ）され、同一キーは `local.yaml` の内容で上書きされる。
3. **環境変数置換**: マージ完了後のYAMLテキスト構造に対し、`${VAR}` プレースホルダーの環境変数置換を行う。
4. **実LLM / シミュレーション判定**:
   * APIキーが未設定であっても、`kind: claude_code`（`claude -p` CLI）や `kind: cli`（agy 等）が指定されている場合は、実LLMモードとして判定され、シミュレーションには退化しません。
5. **エージェント定義の解決**:
   * 指定または上書きされたプロジェクト設定（`project_config`）の `agent_role`（無指定時は `"pm"`) を取得。
   * 対象リポ（サブモジュールならその中）の `.agents/{agent_role}.md` が存在すれば読み込んで、システムプロンプトの末尾に注入する。
