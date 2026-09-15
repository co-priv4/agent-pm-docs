# AUTOMATION.md — agent-pm-docs

大ゴール: AIによる全自動開発の実現。人間より圧倒的に効率的に。(fleet共通)

## 発火 (Driver)
- crontab: 0本(2026-09-15 実測・全41行との突合)
- GitHub Actions: 1本 — deploy-docs.yml

## Kill Switch
`gh workflow disable deploy-docs`

## Status
2026-09-15 初版整備(実測: crontab突合・workflow列挙)。remote: https://github.com/co-priv4/agent-pm-docs.git。fleet台帳: /home/jinno/business_notes/AUTOMATION.md
