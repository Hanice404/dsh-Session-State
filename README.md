# dsh-session-manage

> DeepSeek Harness 的界面插件：**折叠思考过程，直接输出回答内容**；并在会话输入框上方增加一个**会话活动状态条**，实时展示 **Think / Edit / Bash / Read** 的累计次数，可展开与收起。
>
> A UI plugin for the DeepSeek Harness: **folds the thinking process so answers render directly**, and adds a **session-activity status bar** above the composer that shows live totals for **Think / Edit / Bash / Read**, expandable and collapsible.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 功能

| 能力 | 说明 |
| --- | --- |
| **折叠思考过程** | 默认开启：隐藏会话中的「Think」思考块，让回答内容直接展示；在设置中关闭后恢复原生折叠样式 |
| **折叠工具内容** | 默认开启：隐藏会话中的工具调用内容（Bash / Edit / Write / Read / Search / Code），与思考块一样折叠，只保留回答内容 |
| **会话活动状态条** | 在输入框上方显示 `Think` / `Edit` / `Bash` / `Read` 四类活动的累计次数，**左边缘与输入框对齐**（同宽、同左边界，内容左右各留 10px） |
| **展开查看内容** | 点击状态条展开后，不再只显示数字——每个类别都是一个可折叠的分区，列出该类别**每次活动的实际内容**（思考摘要、命令、文件路径等），整个面板可滚动 |
| **运行指示** | 运行中的类别带呼吸灯；`prefers-reduced-motion` 下自动关闭动画 |
| **持久化** | 三个开关都保存在 `~/.dsh/settings.yaml` 的 `dsh-session-manage` 一节 |

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
# 推荐 file:（复制进 profile，依赖解析正确）；link: 软链接会让插件自身的依赖解析失败
dsh plugin --profile web add file:/path/to/dsh-Session-Manage
```

> 也可以直接在 profile 目录用 pnpm 安装：
>
> ```bash
> cd ~/.dsh/profiles/web && pnpm add "file:/path/to/dsh-Session-Manage"
> ```
>
> > ⚠️ 不要用 `link:` 安装本插件：本 profile 使用 `nodeLinker: hoisted`，`link:` 会生成指向插件源码目录的软链接，Node 会按软链接的真实路径解析插件内部的 `@deepseek-ai/*` 导入，导致 `Cannot find package '@deepseek-ai/dsh-settings'`。`file:` 会把插件复制进 `node_modules`，与 `dsh-width` 的安装方式一致，依赖解析正常。

安装后**重启 `dsh web`**（Ctrl+C 后重新运行 `dsh web`），使浏览器端加载新插件 bundle。

## 设置

三个开关都通过 DSH 设置系统持久化（`~/.dsh/settings.yaml` 的 `dsh-session-manage` 一节）：

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `collapseThinking` | `true` | 折叠思考过程，直接输出回答内容 |
| `collapseTools` | `true` | 折叠工具调用内容（Bash / Edit / Read 等），直接输出回答内容 |
| `statusBar` | `true` | 显示会话活动状态条 |

> 目前这三个开关无独立设置页，可直接编辑 `~/.dsh/settings.yaml`，或在后续版本中提供图形界面。命名空间由节点端通过 `settings.register()` 注册，**DSH 0.1.0-rc.7+ 会自动暴露给浏览器**，无需额外步骤。

## 工作原理

- **节点端**（`lib/index.js`）：注册 `dsh-session-manage` 设置命名空间（三个布尔开关，默认 `true`），值持久化到 `~/.dsh/settings.yaml`。
- **浏览器端**（`lib/client.js`）：
  - 通过 `ctx.settingsScope.bind` 订阅设置；`collapseThinking` 开启时注入 CSS 隐藏 `[data-chat-flow] [data-variant="think"]`，`collapseTools` 开启时隐藏 `bash / edit / write / read / search / code` 工具行——选择器限定在聊天流内，不影响详情面板等其他表面；
  - 在 `conversation.input.dock` 槽位（输入框上方的整行区域）注册状态条组件；组件用 `useLayoutEffect` 实时测量 `[data-composer-card]`（输入框）相对其父容器的左偏移与宽度，把状态条设为**同宽、同左边界**（`--dsh-composer-card-max-width` 变量会被 dsh-width 等插件覆盖，故不能依赖它），窗口缩放或卡片尺寸变化时自动重新对齐；
  - 组件用标准 `useSession` 钩子读取会话快照（`nodes` / `partial` / `runningCalls` / `running`），实时汇总四类活动的**次数、运行状态与逐条内容**（思考取首行摘要，工具从 `argsRaw` 提取命令/路径/查询），渲染为可展开/收起的胶囊；展开后是四个可折叠分区的内容面板，整面板可滚动；
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
