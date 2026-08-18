# dsh-session-manage

> DeepSeek Harness 的界面插件：**折叠思考过程，直接输出回答内容**；并在会话输入框上方增加一个**会话活动状态条**，实时展示 **Think / Edit / Bash / Read** 的累计次数，可展开与收起。
>
> A UI plugin for the DeepSeek Harness: **folds the thinking process so answers render directly**, and adds a **session-activity status bar** above the composer that shows live totals for **Think / Edit / Bash / Read**, expandable and collapsible.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 功能

| 能力 | 说明 |
| --- | --- |
| **折叠思考过程** | 默认开启：隐藏会话中的「Think」思考块，让回答内容直接展示；在设置中关闭后恢复原生折叠样式 |
| **会话活动状态条** | 在输入框上方显示 `Think` / `Edit` / `Bash` / `Read` 四类活动的累计次数 |
| **展开 / 收起** | 点击状态条可在「紧凑胶囊」与「明细面板」之间切换；运行中的类别带呼吸灯 |
| **持久化** | 两个开关都保存在 `~/.dsh/settings.yaml` 的 `dsh-session-manage` 一节 |

### 状态条类别归属

| 状态 | 统计来源（工具名） |
| --- | --- |
| **Think** | 助手消息中的 reasoning（思考）块，含流式进行中的思考 |
| **Edit** | `edit`、`write` |
| **Bash** | `bash`、`pwsh` |
| **Read** | `read`、`web_fetch`、`web_search`、`grep`、`glob`、`cordis_package_inspect`、`cordis_runtime_inspect` |

计数口径：已完成的工具调用按结果节点统计，进行中的按在途调用统计，两者互斥、不会重复；思考按「已完成 + 正在流式」统计。

## 安装

```bash
# 从 GitHub 安装（发布后）
dsh plugin --profile web add https://github.com/Hanice404/dsh-Session-Manage/archive/refs/heads/main.tar.gz

# 或从本地目录（开发调试）
dsh plugin --profile web add link:/path/to/dsh-Session-Manage
```

> 也可以直接在 profile 目录用 pnpm 安装：
>
> ```bash
> cd ~/.dsh/profiles/web && pnpm add /path/to/dsh-Session-Manage
> ```

安装后**重启 `dsh web`**（Ctrl+C 后重新运行 `dsh web`），使浏览器端加载新插件 bundle。

## 设置

两个开关都通过 DSH 设置系统持久化（`~/.dsh/settings.yaml` 的 `dsh-session-manage` 一节）：

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `collapseThinking` | `true` | 折叠思考过程，直接输出回答内容 |
| `statusBar` | `true` | 显示会话活动状态条 |

> 目前这两个开关无独立设置页，可直接编辑 `~/.dsh/settings.yaml`，或在后续版本中提供图形界面。命名空间由节点端通过 `settings.register()` 注册，**DSH 0.1.0-rc.7+ 会自动暴露给浏览器**，无需额外步骤。

## 工作原理

- **节点端**（`lib/index.js`）：注册 `dsh-session-manage` 设置命名空间（两个布尔开关，默认 `true`），值持久化到 `~/.dsh/settings.yaml`。
- **浏览器端**（`lib/client.js`）：
  - 通过 `ctx.settingsScope.bind` 订阅设置；`collapseThinking` 开启时注入一条稳定 CSS（`[data-variant="think"]{display:none!important}`）折叠思考块；
  - 在 `conversation.input.dock` 槽位（输入框上方的整行区域）注册状态条组件；
  - 组件用标准 `useSession` 钩子读取会话快照（`nodes` / `partial` / `runningCalls` / `running`），实时汇总四类活动次数并渲染为可展开/收起的胶囊与明细面板；
  - 状态条在无活动时隐藏，会话运行中或已有累计时显示。

## 目录结构

```
dsh-Session-Manage/
├── package.json          # 包清单 + dsh.client 注入配置
├── dsh.plugin.json       # 插件元数据清单
├── cordis.patch.yml      # bundle 组合补丁（loader 条目）
├── lib/
│   ├── index.js          # 节点端：注册 dsh-session-manage 设置命名空间
│   └── client.js         # 浏览器端：折叠思考 + 会话活动状态条
├── README.md
├── CHANGELOG.md
└── LICENSE
```

## 兼容性

- 目标平台：DeepSeek Harness **web**（`dsh --profile web`），版本 `0.1.0-rc.7` 及以后；
- 依赖：见 `package.json` peerDependencies。

## License

MIT
