# 技术栈

## 总体方案

经 2026-10-14 分组选项讨论确认，沿用课程的服务端 TypeScript 应用方案。服务器生成 HTML，浏览器负责显示页面；不引入前端单页应用框架。

| 层次 | 选择 | 简短理由 |
| --- | --- | --- |
| 语言 | TypeScript | 提供静态类型检查，满足工程侧要求。 |
| 运行时 | Node.js | 运行服务端代码，沿用课程生态。 |
| Web 框架 | Hono | 处理路由与中间件，并提供服务端 JSX 支持。 |
| 页面模板 | Hono JSX | 用组件组织服务器生成的 HTML，无需引入 React。 |
| 样式 | 普通 CSS 与 CSS 自定义属性 | 满足外观和响应式需求，保持工具链简单。 |
| 数据库 | SQLite，通过 better-sqlite3 访问 | 本地文件存储，便于教学和演示，无需单独部署数据库服务。 |
| 数据迁移 | 普通 SQL 文件 | 显式记录表结构变化，初期无需 ORM。 |
| 测试 | Vitest | 沿用课程，测试关键功能行为。 |
| 开发运行 | tsx | 直接运行 TypeScript 开发代码。 |
| 类型检查与构建 | tsc | 独立检查类型并进行生产构建；tsx 运行成功不能替代类型检查。 |
| 格式化 | Prettier | 保持代码格式一致。 |

## 一次请求怎样经过这些组件

浏览器请求页面 → Hono 匹配路由 → 按需查询 SQLite → Hono JSX 在服务器生成 HTML → 浏览器展示页面并应用 CSS。

TypeScript 是编写代码的语言，Node.js 是执行代码的运行时，Hono 是处理 Web 请求的框架。这里的 JSX 用于服务端模板，不等于采用 React，也不意味着浏览器需要运行 React。

## 当前不采用

- React、Vue、Svelte：维持课程的服务端渲染方案。
- ORM：当前数据规模使用 SQL 即可。
- Docker：当前阶段不增加容器部署工作。

## 实施约束

技术选型阶段不安装依赖；已授权实现时仅安装当前功能所需依赖。具体版本、命令和运行配置在相应功能阶段结合课程文件与本机环境核对，不提前猜测。若后续需要改变技术路线，应说明对跟课的影响并先讨论。

## 组件输入约定（2026-10-15）

- 组件需要接收参数（props）时，在组件文件中用独立命名的 TypeScript `type` 定义输入，例如 `LayoutProps`，并在组件参数处引用；不将字段类型直接内联在参数声明中。
- 无参数组件不添加空的 Props 类型，不为满足这条约定而增加尚无需求的参数。只有确有跨文件复用需要时，才考虑导出或进一步提取类型。
- 调整 props 定义后，运行 `pnpm typecheck` 和 `pnpm test`，检查调用方与现有行为。TypeScript 类型只提供静态检查，不能代替外部输入的运行时校验。

本约定来自课程第二功能阶段的提示词，是本项目采用的代码组织方式。当前 Layout、Header、Main、Footer 均无参数，本小步只记录约定并验证现状；在后续业务组件确实需要输入时应用。

## 依据

- [课程保存的技术栈](https://github.com/https-deeplearning-ai/sc-spec-driven-development-files/blob/main/Video06_Feature_Specification/specs/tech-stack.md)
- [第二功能阶段提示词：独立 props 类型与重新测试](https://github.com/https-deeplearning-ai/sc-spec-driven-development-files/blob/main/Video10_The_second_feature_phase/prompts.md)

本文保留课程技术选择，补充中文用途说明和类型检查提醒。


## 项目共同验证要求（2026-10-15）

- 使用 Vitest；package.json 的 test 脚本执行 vitest run，通过 pnpm test 运行。独立类型检查和构建仍分别运行。
- 保留已有测试，新功能按适用性覆盖成功路径、重要无效输入和数据副作用。不以测试数量或整页快照代替行为检查。
- 布局与响应式用真实浏览器验证，Vitest 不替代视觉检查。
- 产品页面检查 375×812、768×1024、1440×900 CSS 像素视口。文字与主要操作可用，页面无意外横向溢出；宽表格允许在明确的局部容器内横向滚动。验收视口不强制成为 CSS 断点。
- 合并前手动调用项目内 $agentclinic-changelog 更新根目录 CHANGELOG.md。技能不自动提交或合并。
