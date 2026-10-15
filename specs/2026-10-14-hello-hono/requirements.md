# Hello Hono：需求规格

## 上下文与依据

本功能对应 ../roadmap.md 的阶段 1，遵守 ../mission.md 与 ../tech-stack.md。使用服务端 TypeScript、Node.js、Hono、Hono JSX 与普通 CSS；验证使用 Vitest。

课程参考：https://github.com/https-deeplearning-ai/sc-spec-driven-development-files/blob/main/Video06_Feature_Specification/prompts.md

## 本次目标

建立可运行、可检查的最小服务，提供有轻量样式的 AgentClinic HTML 首页，证明从 TypeScript 配置到真实页面展示的基础路径可用。

## 范围与决策

- 提供 GET /，返回 HTTP 200；Content-Type 为 text/html，可附带字符集。
- 使用 Hono 服务端 JSX 生成完整 HTML 文档，包含页面标题、语言声明、字符编码与适配移动端的 viewport 设置。
- 页面包含一个 AgentClinic 主标题、一段简短的幽默诊所介绍，以及营业提示 AgentClinic is open for business。
- 简介延续 mission.md 的虚构诊所定位，不承诺已实现预约等功能。具体措辞实现时拟定，不逐字冻结；规格和说明用中文，页面保留品牌与指定英文营业提示。
- 普通 CSS 设置字体、留白、背景与内容宽度；使用语义化 HTML，375×812、768×1024、1440×900 视口下文字可读、无页面横向溢出。
- 不提供业务入口、按钮、无效链接或功能预告；增加由独立 Header、Main、Footer 组件组成的 Layout，但不添加导航。
- 提供开发启动、独立类型检查、生产构建、构建产物启动与测试入口，并记录实际命令。
- 使用 tsx 开发运行，tsc 检查类型与构建，Vitest 验证路由响应与页面内容。
- 启动说明包含环境要求、安装步骤、访问地址和停止方法；依赖版本与端口在实现时核实并记录。

## 不包含

数据库、业务列表、预约、仪表盘、身份认证及部署流水线。已选技术栈不意味着第一阶段必须安装所有后续依赖。新阶段 2“Agents 与病症”复用本阶段已有布局，业务范围见 roadmap.md。

## 本次需求变更

依据课程第二条提示及选项回答，将纯文本启动页升级为最小品牌首页。最终首页用 HTML 替代纯文本，不增加第二个演示路由；原营业提示保留为页面内容。计划增加独立首页任务组，验收同步增加 HTML 内容与浏览器布局检查。

## 当前状态

2026-10-14 已完成内容、外观和验收变化的选项讨论。2026-10-15 已完成最小首页实现与检查，证据见 validation.md；本节新增布局要求也已实现并通过复核。


## 课程验证阶段的结构调整（2026-10-15）

- Header、Main、Footer 分别放在独立文件；Layout 导入并组合三者。
- Header 放品牌标题，Main 放原简介，Footer 放原营业提示，保持既有外观与内容。
- CSS 提取为 public/styles.css，由 HTML link 加载，服务提供正确的 CSS 响应；开发与生产启动均可加载。
- 按 Node.js + tsc 路线，使用浏览器样式链接，不直接在 Node.js 中 import CSS；资源定位不依赖工作目录。部署需要同时携带 dist 与 public。


## 重新规划后的共同要求

遵守 tech-stack.md 的关键行为测试与三档响应式要求。本功能没有用户写入操作，不为不存在的数据副作用编写测试；宽表格局部滚动规则当前不适用。
