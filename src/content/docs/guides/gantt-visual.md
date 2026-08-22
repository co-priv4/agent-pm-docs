---
title: ガント可視化
description: Projects v2 Roadmap ビューの初回設定をスクリーンショットで解説
---

# ガント可視化マニュアル（スクリーンショット付き）

`sync_projects.py` + `sync_project_dates.py` 実行後の Projects v2 ボードで
**Roadmap（ガント）ビューを初めて表示するまで**の手順を画像で示します。

> 実機検証: 2026-08・ユーザー所有ボード（issue 5 件・RCPSP スケジュール）。

## 前提

- `sync_project_dates.py` が完了している（Start/Due の DATE フィールド作成 +
  各 item へ日付反映。スコープ `project` と実行コマンドは
  [認証と権限 §4](/agent-pm-docs/guides/auth/) 参照）
- ボード URL は所有者タイプで変わる:
  - ユーザー所有: `https://github.com/users/<login>/projects/<N>`
  - org 所有: `https://github.com/orgs/<org>/projects/<N>`
- Roadmap ビューの**日付軸紐付けは API 非公開**（`ProjectV2ViewConfiguration`
  が未公開）のため、初回のみブラウザで 2 クリック必要 — それが本マニュアルの
  Step 3 です。**以降の日付更新はすべて自動**（Step 5）。

## Step 1: テーブルビューで Start/Due 列を表示する（確認用・任意）

sync 直後のボード（View 1 = テーブル）。Start/Due はまだ非表示です。

![初期ボード](/agent-pm-docs/images/gantt-1-board-initial.png)

右端の **「+」（Add field）** をクリック → 「Hidden fields」欄の
**Start** と **Due** にチェックを入れます。

![Start/Due 列の表示](/agent-pm-docs/images/gantt-2-startdue-fields.png)

sync が反映されていれば、各 issue 行にスケジュール済みの日付が見えます。
ここで日付が空の issue がある場合は前提の sync を先に確認してください。

## Step 2: Roadmap ビューを作成する

ビュー名タブの右にある **「+ New view」** をクリックすると Layout メニューが
開くので **Roadmap** を選びます。

![New view の Layout メニュー](/agent-pm-docs/images/gantt-3-newview-roadmap-menu.png)

> **注意（実測）**: 一度のクリックで効かずテーブルのまま（URL が
> `/views/1` のまま）になることがあります。その場合はもう一度
> 「+ New view」タブを開き Roadmap をクリックしてください。URL が
> `/views/2` に変わり Roadmap レイアウトが適用されます。

## Step 3: 日付軸を紐付ける（初回のみ・本文書の目的）

作成直後の Roadmap は日付軸が未紐のため、行にバーが出ません
（「date or iteration フィールドが必要」などの案内が出る）。

![紐付け前の Roadmap](/agent-pm-docs/images/gantt-4-roadmap-before-binding.png)

ツールバーの **「Date fields」（Select date fields）** ドロップダウンを開き:

![Date fields ドロップダウン](/agent-pm-docs/images/gantt-5-date-fields-dropdown.png)

- **Start date** = `Start`
- **Target date** = `Due`

を選ぶと、即座に行にガントバーが描画されます。この紐付けが
**API で設定できない唯一の手動ステップ**です（1 回実行すれば永続）。

## Step 4: ビューの保存とリネーム

紐付けただけでは「Unsaved changes」のままなので保存します:

1. ツールバー右の **View ▾（Unsaved changes 表示付きボタン）** をクリック
2. **Save view** → 確認ダイアログの **Save**
3. （任意）ビュー名を変える: **View options（ビュー名の右）→ Rename view →
   「Roadmap」**

完成形（View 1 に Start/Due 列表示、View 2 = Roadmap を保存済み）:

![完成した Roadmap](/agent-pm-docs/images/gantt-6-roadmap-final.png)

## Step 5: 以降の運用（自動）

タスクの追加・完了・依存変更があったら同期を再実行するだけで、
Roadmap のバーは自動で更新されます（ビュー設定の再操作は不要）:

```bash
GITHUB_TOKEN=$(gh auth token) python scripts/sync_project_dates.py \
  --repo YOUR_OWNER/YOUR_REPO --project-number <N>
```

## トラブルシュート

| 症状 | 原因と対処 |
| :--- | :--- |
| バーが 1 本も出ない | 日付軸が未紐付け（Step 3）か、sync_project_dates 未実行 |
| 一部の issue だけ日付が空 | issue 本文の `見積工数` / `依存関係` フォーマット不一致、またはボード未追加（sync_projects.py を先に） |
| `orgs/...` の URL で 404 | ユーザー所有ボードは `users/<login>/projects/<N>`（sync 出力の URL は正規 URL を優先します） |
| Roadmap クリックでレイアウトが変わらない | Step 2 の注意: New view タブを開き直して再度 Roadmap をクリック |

## 関連ドキュメント

- [認証と権限](/agent-pm-docs/guides/auth/) — 認証・スコープ（`project` read/write が必要）
- [概要](/agent-pm-docs/) — ガント機能の概要と RCPSP スケジューリング
- [機能ガイドブック](/agent-pm-docs/guides/guide/) — 全アクションとバックエンド
