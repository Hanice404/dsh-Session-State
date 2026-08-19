# Changelog

All notable changes to this project will be documented in this file.

## [0.3.1] - 2026-08-19

### Fixed

- **收起状态下不再留白**：状态条收起时改为紧凑胶囊（自然宽度，仅显示芯片 + 箭头），不再是占满输入框宽度的空行，会话内容区不会出现滚动留白；展开时仍保持与输入框左右两侧对齐的全宽面板。

## [0.3.0] - 2026-08-19

### Changed

- **插件更名为 `dsh-Session-State`**（内部 id / npm 包名 / 设置命名空间为 `dsh-session-state`），GitHub 仓库同步更名为 `Hanice404/dsh-Session-State`。安装命令与设置路径同步更新。

## [0.2.3] - 2026-08-19

### Fixed

- **真正修复「与输入框左右两侧对齐」**：此前对齐测量以 `bar.parentElement` 为参照，但 DSH 的槽位渲染器会给每个槽位包一层 `display: contents` 的 `<div data-slot=…>`，其 `getBoundingClientRect()` 全为 0，导致工具条被推到错误位置。现在改为以 `[data-composer-seat]`（真实 flex 盒子）为参照测量 `[data-composer-card]` 的左偏移与宽度，并增加挂载后的一次重测 + `ResizeObserver` 持续对齐。

## [0.2.2] - 2026-08-19

### Changed

- 状态条**左右两侧都与输入框对齐**：工具条整行（收起时的胶囊行）与展开面板都占满输入框宽度、左右边缘与输入框对齐（此前收起态只是左侧小胶囊、面板有 10px 内缩）。

## [0.2.1] - 2026-08-19

### Fixed

- 状态条改为**左边缘与输入框对齐**：通过 `useLayoutEffect` 实测 `[data-composer-card]` 的位置与宽度（不再依赖会被 dsh-width 覆盖的 `--dsh-composer-card-max-width` 变量），窗口缩放 / 卡片尺寸变化时自动重新对齐。

## [0.2.0] - 2026-08-19

### Added

- 折叠工具内容：`collapseTools`（默认开启）折叠会话中的工具调用内容行（Bash / Edit / Write / Read / Search / Code），与思考块一样直接输出回答内容。
- 状态条展开面板改为**内容视图**：每个类别（Think / Edit / Bash / Read）是一个可折叠分区，列出该类别每次活动的实际内容（思考首行摘要、命令、文件路径、查询等），整个面板可滚动，不再只显示数字。

### Changed

- 状态条宽度与输入框（composer card）两侧对齐，内容左右各留 10px 间距。
- 折叠 CSS 限定在 `[data-chat-flow]` 内，不影响详情面板等其他表面。

## [0.1.0] - 2026-08-18

### Added

- 折叠思考过程：`collapseThinking`（默认开启）折叠会话中的 Think 思考块，直接输出回答内容。
- 会话活动状态条：在输入框上方展示 `Think` / `Edit` / `Bash` / `Read` 累计次数，可展开与收起。
- 运行中类别带呼吸灯指示，`prefers-reduced-motion` 下自动关闭动画。
- 节点端注册 `dsh-session-state` 设置命名空间，开关持久化到 `~/.dsh/settings.yaml`。
