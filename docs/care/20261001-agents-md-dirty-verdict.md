# Care 診断記録 — `post_dispatch: target worktree is dirty after dispatch: ?? AGENTS.md`（2026-10-01）

- Run: 20261001 inbox-care（Investigate, repo_id=agent-pm-docs）の判定を永続化したもの
- 前例: `docs/care/20260925-fetch-timeout-verdict.md`（fetch-timeout は別障害・判定独立）

## 機械可読判定（machine-readable verdict）

```json
{
  "root_cause": "deterministic seeding/cleanliness loop, not a transient flake: the tas_autopilot daemon AGENTS.md maintenance phase (control_plane/agents_md.py, existence-based idempotency, kind=product requires AGENTS.md) regenerates an untracked AGENTS.md whenever a branch switch removes the file from the working tree, because main did not track it; post_dispatch.py prepare_pr_branch_from_base then requires a porcelain-clean worktree before parking/landing unpublished commits and raised auto_merge_blocked 'target worktree is dirty after dispatch: ?? AGENTS.md', failing the self-push on every reseed",
  "fix_or_boundary": "fix (already landed on both sides): AGENTS.md is now tracked — origin/main e7f2fb1 (PR #2, 2026-10-01 12:16:37 +0900, blob c1341b3d2c5ef50e6e1936d4ad86d7d486ed325d) and local main a52dda6 (chain sweep 2026-10-01 16:54:33 +0900, identical blob). The seeder now takes the skip-present path, so the dirt source is gone. Residual boundary (out of repo): local main is [ahead 1, behind 1]; a52dda6 duplicates an add origin/main already contains, so the next post_dispatch rebase onto origin/main turns it into an empty commit and halts (nonzero) — default-branch reconciliation is append-only-forbidden for care and belongs to the tas_autopilot park-and-PR/caretaker path (e.g. rebase with empty-commit drop for sweep-recovered duplicates)",
  "branch": "tas/auto-care/20261001"
}
```

## 診断詳細（証拠）

1. **seeder は存在ベースの冪等** — `tas_autopilot/tas_autopilot/control_plane/agents_md.py`: "Idempotency is existence-based: if AGENTS.md already exists (any content), it is skipped untouched; if absent and the kind requires one, it is generated from a template." `kind=product` は required（`_DEFAULT_REQUIRED`）。daemon フックは `control_plane/daemon.py`（`_phase_agents_md`、`agents_md_interval_seconds` 毎）。
2. **dirty チェックは porcelain 完全空を要求** — `tas_autopilot/tas_autopilot/control_plane/post_dispatch.py` `prepare_pr_branch_from_base`: 未 publish commit がある場合 `git status --porcelain` が非空なら `PostDispatchError(kind="auto_merge_blocked", title="post_dispatch: target worktree is dirty after dispatch")`。untracked `?? AGENTS.md` がこれに該当。
3. **ループの実績** — 同一パスへの sweep 吸収が系統的に発生: `a233442`（recover leftover）→ `e7f2fb1`（PR #2 経由で origin/main へ、2026-10-01 12:16）→ `a52dda6`（recover leftover、ローカル main、2026-10-01 16:54）。ブランチ切替で main 追跡外のファイルが消える → daemon が再生成 → 次の dispatch で dirty 失敗、の反復。
4. **当日のタイムライン** — 12:16:37 PR #2 が origin/main に AGENTS.md を着地 / 12:23:11 ローカル checkout の AGENTS.md が daemon 再生成（mtime 実測、当時のローカル main は未追跡）→ dispatch が `?? AGENTS.md` で push_failed、inbox care 発火 → 16:54:33 chain sweep がローカル main へ回収（現 HEAD）。
5. **blob 一致の確認** — `git ls-tree`: a52dda6 と origin/main の AGENTS.md は同一 blob `c1341b3d2c5ef50e6e1936d4ad86d7d486ed325d`。`git diff a52dda6 origin/main -- AGENTS.md` は空。

## 対応状況

- **本リポ内で可能な恒久修正（AGENTS.md を tracking に入れる）は既に両側で成立**しており、seeder は今後 skip-present を通るため本障害の再発源は消滅。追加のリポ内変更（.gitignore 追加等）は不要かつ不実施。
- 本 care run の成果物は本判決記録のみ（前例 20260925/20260926 と同一運用）。

## リポ外残課題（tas_autopilot 側）

1. ローカル main は `[ahead 1, behind 1]`。次回 post_dispatch が分岐解消のため `git rebase origin/main` を実行すると、a52dda6 は origin/main が既に持つ同一内容の追加と重複し **空コミット化で rebase が停止**（非ゼロ終了 → 別系統の `auto_merge_blocked` 失敗）する可能性が高い。デフォルトブランチの reconciliation（rebase/reset/merge）は care の append-only 規律上禁止のため実施しない。対処は park-and-PR / caretaker 側（sweep 由来の重複 add を落とす rebase ポリシー等）。
2. （設計メモ）daemon seeding は untracked ファイルを残すため、tracking 未整備の管理リポでは本障害を構造的に起こし得る。seeding 後の commit または dirty-check の seeding 由来除外は tas_autopilot 側の改善候補。

## 再発時の再確認の起点

caretaker が本リポで再び `dirty after dispatch` を検知した場合は再調査せず、まず (1) `git status --porcelain` の該当ファイル、(2) AGENTS.md が main で追跡済みか（`git ls-tree main AGENTS.md`）、(3) 本記録の残課題 1（rebase 空コミット停止）が起きていないかを確認すること。
