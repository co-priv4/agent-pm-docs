---
title: 認証と権限
description: gh CLI / PAT の選択・必要スコープ・権限×機能の可否表
---

# 認証と権限（AUTH）

agent-pm の GitHub 認証（gh CLI / PAT の選択）・必要スコープ・「どの権限で何ができるか」の早見表。
対象読者: 自分のリポジトリで agent-pm を使い始める人（GitHub 初心者を含む）。

> **思想（詳細は [クイックスタート](/agent-pm-docs/getting-started/) の安全設計 / [機能ガイドブック](/agent-pm-docs/guides/guide/)）**:
> - 読取系アクションは常に直接実行。**書込系は既定 PREVIEW**（提案を `reports/` に記録するだけで実行しない）。実行は `--auto-dev` 明示時のみ。
> - clone しても**定期実行は一切走らない**（cron は開発元環境の CI 専用）。
> - 認証・権限は「不足したらその場で失敗する」設計。過剰な権限を事前要求しない。

## 1. 認証方法の選択

GitHub API は**読取系アクションでも認証必須**です（内部で gh CLI を使うため。未認証のまま
`--dry-run` なしで実行すると `HTTP 401` で失敗します）。

| 方法 | 向いている人 | 手順 |
| :--- | :--- | :--- |
| **gh CLI（推奨）** | 手元の PC で使う人・GitHub 初心者 | `gh auth login`（対話式・ブラウザ認証） |
| PAT | CI / ヘッドレス環境 | classic PAT を発行し `.env` の `GITHUB_TOKEN` に記載 |

### 1-A. gh CLI（推奨）

```bash
# gh 未導入なら https://cli.github.com/ （brew install gh / winget install GitHub.cli 等）
gh auth login
# → What account do you want to log into? = GitHub.com
#   → Login with a web browser（表示されたワンタイムコードをブラウザで入力）
```

`gh auth login` の既定スコープは `repo` / `read:org` / `gist` — issue・PR・milestone の
読取/書込に足ります。Projects v2（ガント）を使う場合は追加スコープが必要（§1-C）。

### 1-B. PAT（classic）

1. GitHub Web → Settings → Developer settings → **Personal access tokens → Tokens (classic)**
   → Generate new token (classic)
2. スコープ: `repo`（+ org リポ運用なら `read:org`）+ Projects v2 を使うなら `project`
3. `cp .env.template .env` して `GITHUB_TOKEN=<token>` を記載

- **classic を使う理由**: fine-grained PAT は**ユーザー所有（@me）の Projects v2 ボードで
  ProjectV2 API が弾かれる**ため（org 所有ボードは "Projects" 権限で使用可）。
- `.env` の `GITHUB_TOKEN` が設定されていればそちらが優先。未設定なら `gh auth login` の認証を使用。

### 1-C. スコープ早見表

| スコープ | 付与方法 | 使えるようになる機能 |
| :--- | :--- | :--- |
| `repo` `read:org` `gist` | `gh auth login` 既定 | issue / PR / milestone / ラベルの読取・書込（21 アクションの基本） |
| `read:project` | `gh auth refresh -s read:project` | issue → ボード同期（`sync_projects.py`） |
| `project`（read/write） | `gh auth refresh -s project` | DATE フィールド作成・item 日付書込（`sync_project_dates.py`）。read/write の強権限なので必要時のみ |

スコープ不足で実行すると `INSUFFICIENT_SCOPES` エラーになります（不足スコープ名が
メッセージに含まれるため、指示に従って `gh auth refresh -s <scope>` すれば回復します）。

`gh auth refresh` に `--user` フラグはありません（2026-08 実測）。アカウントを複数
保持している場合は、先に `gh auth switch --user <login>` で対象アカウントを
アクティブにしてから refresh してください（refresh はアクティブアカウントに作用）。

なお **`gh auth status` のスコープ表示は当てになりません**（refresh 後も古い表示の
ままになることがある）。実際に付与されているスコープは API レスポンスヘッダが真実です:

```bash
curl -sI -H "Authorization: Bearer $(gh auth token)" \
  https://api.github.com/user | grep -i x-oauth-scopes
```

## 2. 権限×機能の可否（誰のリポで何ができるか）

| 操作 | 自分のリポ | 他人の public リポ | 他人の private リポ |
| :--- | :--- | :--- | :--- |
| 読取系（スタンドアップ・デイリーレビュー等） | ○ | ○（認証のみ必要） | read 権限があれば ○ |
| 書込系 `--auto-dev`（issue / milestone / PR の作成・変更） | ○ | **write 権限が必要**（collaborator 招待） | 同左 |
| Projects v2 同期・ガント | ○ | **自分所有のボードなら可**（public リポの issue は自分のボードに追加できる。リポ側には何も書かない） | issue の read 権限 + 自分所有ボード |

ポイント: **ガント可視化だけなら write 権限の交渉は不要**。日付を sync するのは自分の
ボードなので、相手リポは読むだけです。

## 3. 自分のリポを PM 対象にする

設定は `config/agent_pm_config.local.yaml`（`.gitignore` 対象。詳細は
[設定パターン §2 パターン 3](/agent-pm-docs/guides/config-patterns/)):

```yaml
projects:
  my_project:
    platform: "github"
    repository: "YOUR_OWNER/YOUR_REPO"
    ai_tool: "claude_code"   # ローカル Claude Code CLI（API キー不要）
```

```bash
python agent-pm.py claude PM スタンドアップ --project my_project
```

対象リポ側に `.agents/pm.md`（エージェントロール定義）が無くても動作します（警告が出るのみ）。
対象リポに `.agents/<role>.md` を置けばロール定義が効きます。

## 4. ガント（Projects v2）を始める

```bash
# 0. リポの Issues 機能が有効か確認（create_tasks / sync の前提。
#    false の場合、issue 作成が 410/404 になる — リポ管理者が有効化）
gh api repos/YOUR_OWNER/YOUR_REPO --jq .has_issues
gh api -X PATCH repos/YOUR_OWNER/YOUR_REPO -f has_issues=true   # 無効だった場合

# 1. ボード作成 + リポ連携（初回のみ）
gh project create --owner "@me" --title "my_project PM"
gh project list --owner "@me"                    # ボード番号を確認
# link の --owner には実在の login、--repo にはリポ名のみを指定。
# "OWNER/REPO" のフルパス指定と "@me" はどちらもエラーになります（2026-08 実測）。
gh project link <N> --owner <あなたのlogin> --repo YOUR_REPO

# 2. local.yaml にボード番号を記載
#    github_projects:
#      project_number: <N>    # 他人のリポを自分のボードで見る場合は owner: <自分のlogin> も明示

# 3. issue → ボード同期 → 日付算出・反映
gh auth refresh -s project   # DATE フィールド作成に必要（初回のみ）
python scripts/sync_projects.py --repo YOUR_OWNER/YOUR_REPO --project-number <N>
python scripts/sync_project_dates.py --repo YOUR_OWNER/YOUR_REPO --project-number <N> --dry-run
```

ボード URL は所有者タイプで変わります: ユーザー所有は
`https://github.com/users/<login>/projects/<N>`、org 所有は
`https://github.com/orgs/<org>/projects/<N>`。

Roadmap ビューの初回 2 クリック設定（日付軸紐付け・API 非公開）はスクリーンショット付きの
[ガント可視化](/agent-pm-docs/guides/gantt-visual/) に手順があります。
