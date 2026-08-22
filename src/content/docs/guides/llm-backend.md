---
title: LLMバックエンド
description: LLM 推論の構造とバックエンド設定のカスタマイズ
---

# LLMバックエンド設定と構造

AGENT_PM が LLM 推論をどう解決し、ユーザーがどのように設定をカスタマイズできるかを説明します。

---

## 1. 全体構造
LLM 呼び出しは、以下の構造に分離されています。

- **エントリ (`agent-pm.py`)**: ユーザーの入力を受け取り、適切なハンドラーを起動します。
- **レジストリ (`handlers/__init__.py`)**: 設定されたプロバイダー名から、対応するハンドラークラスを解決します。
- **共通インフラ (`handlers/base_handler.py`)**: APIキーの有無による動作切り替え、リトライ、サーキットブレーカー、キャッシュなどの制御を共通で行います。
- **バックエンド (`handlers/*_pm.py` など）**: 各プロバイダー独自のAPI SDKやCLIを呼び出します。

### プロバイダー指定と `auto` センチネル
プロバイダーは `agent-pm.py <provider> PM ...` の第1引数で指定します。明示的な名前（`claude` / `gemini` / `antigravity` 等）はそのまま使われます。

加えて **`auto`** を指定すると、プロバイダーを **config から解決** します（`handlers/__init__.py: resolve_provider_name`）:

1. `projects.<project>.ai_tool`
2. `system.default_ai_tool`

これにより cron パイプライン等は `auto` を呼ぶだけで、実際のバックエンドは設定変更のみで切り替えられます。コードや YAML に単一の（期限切れしうる）プロバイダーを硬编码する必要がありません。**既定は `claude_code`（ローカル Claude Code CLI・モデルは CLI 既定）**。未設定の場合は `auto` が未解決となり明確にエラーになります。

---

## 2. 設定可能項目
設定ファイル（`config/agent_pm_config.yaml`）の `ai_providers` セクションで、各LLMプロバイダーの動作をカスタマイズできます。

### プロバイダー共通の設定項目

| 設定キー | 型 | 必須 | 説明 | 記述例 |
|---|---|---|---|---|
| `kind` | `str` | 任意 | プロバイダーの系統（アダプター種類）を指定します。未指定の場合はプロバイダー名で解決します。<br>値: `anthropic` \| `google` \| `openai_compat` \| `cli` \| `claude_code` | `kind: anthropic` |
| `api_key` | `str` | 任意 | API呼び出しに使用するAPIキー、または環境変数プレースホルダーを指定します。 | `api_key: "${ANTHROPIC_API_KEY}"` |
| `default_model` | `str` | 必須* | 既定で使用するモデル名を指定します。CLI 系（`cli` / `claude_code`）では未設定可 = CLI 既定モデル（`--model` flag を渡さない）。 | `default_model: "claude-3-5-sonnet-latest"` |

実行時のモデル上書き: `python agent-pm.py <provider> PM <action> --model=NAME`（優先順: CLI > config `default_model` > ハンドラ既定）。有効なモデル名は各 CLI 側の定義に従います。

### プロバイダーごとの固有設定項目

#### Claude (`kind: anthropic` の場合)
- **API 経路専用**。`claude` バイナリ経由の CLI 実行は `claude_code` kind（下記）を使用します。
- **z.ai GLM proxy 対応**: `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_BASE_URL` を環境変数に設定すると、proxy 専用機でも `api_key` 未設定で simulation gate を回避して実行できます（API 直叩き経路）。

#### Gemini (`kind: google` の場合)
SDK `google-genai` を使用。3つの生成メソッドを提供:
- **テキスト生成** `_call_llm_provider`: `client.models.generate_content(model, contents, config=GenerateContentConfig(system_instruction=...))`
- **ストリーミング** `_call_llm_provider_stream`: `generate_content_stream` で chunk を順次 yield（空 chunk は skip）
- **マルチモーダル** `_call_llm_provider_multimodal`: `types.Part.from_bytes` で画像パートを構築し `[text, image]` を送信

- **`generation_config`** (`dict`, 任意): `temperature` / `top_p` / `top_k` / `max_output_tokens` を config から調整。allowlist + 型チェック（int/float のみ）で設定ミスが SDK 呼び出しを落とさないよう防御。未設定時は SDK デフォルト（後方互換）。**`thinking_level`**（Gemini 3.x: minimal/low/medium/high）は別途 `ThinkingConfig` に渡す（文字列のみ有効・大文字小文字問わず正規化・無効値は無視）。
  ```yaml
  gemini:
    kind: google
    default_model: "gemini-3.6-flash"
    generation_config:
      thinking_level: low    # Gemini 3.x 推論強度（minimal/low/medium/high）
      temperature: 0.7
      top_p: 0.95
      max_output_tokens: 8192
  ```

#### OpenAI互換エンドポイント (`kind: openai_compat` の場合)
- **`base_url`** (`str`, 必須):
  - APIのエンドポイントURLを指定します。これにより、DeepSeek、MiniMax、またはローカルで起動した Ollama や vLLM などをシームレスに利用できます。
  - `env_var` を指定して、APIキーの環境変数名を指定することも可能です。

#### CLI エージェント (`kind: cli` の場合)
prompt→stdout 型の CLI エージェント（Antigravity `agy` / aider 等）を config だけで接続。API キー不要（CLI が自身の認証を使う）。`claude_code` kind（`claude -p` 固定）と異なり、**コマンドは完全に config 駆動**。
- **`cli_command`** (`list`, 必須): ベースコマンド + 固定フラグ（例: `["agy"]`）
- **`cli_prompt_flag`** (`str`, デフォルト `--print`): プロンプトを値として受け取るフラグ（agy は stdin 非対応のため positional-flag 形式）
- **`cli_model_flag`** (`str`, 任意): モデルを値として受け取るフラグ（例: `--model`）
- **`cli_timeout`** (`int`, デフォルト `300`): 秒
- system_prompt は user_content に前置結合（多くの CLI は system 別フラグを持たないため）
  ```yaml
  antigravity:
    kind: cli
    cli_command: ["agy"]
    cli_prompt_flag: "--print"
    cli_model_flag: "--model"
    default_model: "claude-sonnet-4-6"
  ```

#### Claude Code CLI (`kind: claude_code` の場合)
ローカルの `claude` CLI（Claude Code）を `claude -p` で起動。`kind: cli`（汎用・プロンプト前置結合）と異なり、**system_prompt は `--system-prompt` flag・user_content は stdin** で role を分離する。認証は `~/.claude`（CLI 自身）・api_key 不要。バックエンドが GLM（z.ai proxy）の場合、CLI が `ANTHROPIC_BASE_URL` を読んで自前ルーティングするため agent-pm 側は実体不確実（報告は `[実体不明:CLI]`・proxy 推定で `z.ai(proxy推定)`）。
  ```yaml
  claude_code:
    kind: claude_code
    cli_timeout: 300
    # default_model 未設定 = CLI 既定モデル（--model を渡さない）
  ```
`claude` バイナリが PATH に無い環境（CI コンテナ等）では自動で simulation に劣化します（graceful degrade）。独立 kind として CliPM 系の派生ハンドラで起動します。

> [!NOTE] Phase 2 移行（`use_cli` → `claude_code`）
> 従来は `claude` provider + `use_cli: true`（または `USE_CLAUDE_CLI=true`）で CLI 起動していました。Phase 2 でこの経路は削除され、`claude_code` kind に一本化されました。移行は `ai_tool: claude_code` への切替のみです。
> - **失敗モードの変化（重要）**: 従来 `use_cli` は `claude` バイナリ不在時に `RuntimeError` で即停止（loud fail）しました。`claude_code` は simulation に**無言劣化**（graceful）します。クラッシュをシグナルにしていた自動化では、simulation banner / `_degraded_to_simulation` の監視が必要です。
> - **model 既定値**: 現在は CLI 既定モデル（`default_model` 未設定時は `--model` を渡さない）。実行時は `--model=NAME` で上書き可。

---

## 3. LLM 実行経路

### 2つの経路
- **API 実行**（デフォルト）: 各 provider の SDK で API を直接呼ぶ。CI/バッチ向き。review_pr（PR レビュー）はこの経路。
- **agent 実行**（`kind: cli` / `kind: claude_code`）: ローカル CLI agent（`claude` / `agy` 等）を起動。インタラクティブ作業向き。

---

> [!NOTE]
> 設定ファイルは `config/agent_pm_config.yaml` がデフォルト（コミット対象）。ローカル固有の上書きは `config/agent_pm_config.local.yaml`（自動 `.gitignore`）で。環境変数テンプレートは `.env.template`。
