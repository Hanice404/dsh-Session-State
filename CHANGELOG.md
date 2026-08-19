# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-08-18

### Added

- 折叠思考过程：`collapseThinking`（默认开启）折叠会话中的 Think 思考块，直接输出回答内容。
- 会话活动状态条：在输入框上方展示 `Think` / `Edit` / `Bash` / `Read` 累计次数，可展开与收起。
- 运行中类别带呼吸灯指示，`prefers-reduced-motion` 下自动关闭动画。
- 节点端注册 `dsh-session-manage` 设置命名空间，两个开关持久化到 `~/.dsh/settings.yaml`。
