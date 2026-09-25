# Care 診断記録 — caretaker `git fetch origin timeout`（2026-09-25）

- Run: 20260925-145638-079278 (Investigate) の判定を機械可読で永続化したもの
- 診断本体（観測ログ・sha256 証拠つき）: `docs/llm-wiki/relations.md`（care branch `tas/auto-care/20260925`, commit 71a35f8）
- 判定: 本リポジトリは健常。ホスト WAN 不安定が原因で、対応はリポ外（boundary）

## 機械可読判定（machine-readable verdict）

```json
{
  "root_cause": "host WAN instability on jinno-desktop — NetworkManager CONNECTED_SITE flaps (2026-09-25T10:50:35Z), dockerd external-DNS i/o timeouts, multi-repo same-second fetch failures (5 repos at 2026-09-25T10:53:53Z, 8 repos at 2026-09-24T13:23:40Z), self-resolving within minutes",
  "fix_or_boundary": "boundary: out-of-repo — mitigation belongs to the host owner (uplink/router repair) or to tas_autopilot fetch policy (self_pull_timeout_seconds, git http.lowSpeedLimit/lowSpeedTime on the sweep), not to this repository",
  "branch": "tas/auto-care/20260925"
}
```

## ローカル git チューニング（http.lowSpeedLimit/lowSpeedTime）を適用しない理由

1. 障害は fleet 全体規模（自己プル掃引 248 リポ中 5〜8 件が同一秒に失敗）であり、本リポ固有の設定不備ではない。リポローカルのチューニングは 248 分の 1 にしか効かない。
2. アップリンクが正常なとき `git fetch origin --dry-run` は 0.6 秒で完了しており、タイムアウト閾値の問題ではない（relations.md の Observation 記載の実測）。
3. 低速許容の緩和は stall の長期化（掃引 320 秒超過のさらなる悪化）を招く。git レベルの fast-fail 導入は、fetch を発行する tas_autopilot 側で一括適用すべきであり、その選択肢は relations.md の Follow-up に既に記録済み。

次回以降、caretaker が本リポで `pull_failed` / `caretaker_chronic_failure` を検知した場合は、再調査せず本記録と relations.md の観測（NetworkManager / dockerd / tailscale の同時刻ログ照合）を起点に、ホスト WAN の状態を確認すること。
