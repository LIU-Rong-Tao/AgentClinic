# AgentClinic

## 当前交付状态（2026-10-16）

已完成 MVP、访客反馈与客户评价，当前 100 项测试、类型检查、构建和默认格式检查通过。反馈和评价均已通过用户体验验收。下方阶段记录保留历史状态；最新事实以本节及各功能验收记录为准。

- `/feedback` 收集昵称、内容和评分，员工从仪表盘进入 `/dashboard/feedback` 查看。
- `/reviews` 展示 3 条明确标注为虚构的评价，与真实访客反馈分离。
- 项目内 `.agents/skills/feature-spec/SKILL.md` 已创建并实际用于客户评价规格；官方校验脚本缺少 PyYAML，基础结构检查和实际调用已完成，不宣称官方校验通过。
- 新环境安装 Node.js 24、pnpm 11 后，在项目根目录运行 `pnpm install --frozen-lockfile`、`pnpm seed`、`pnpm dev`；检查使用 `pnpm test`、`pnpm typecheck`、`pnpm build`、`pnpm format:check`。生产入口为 `pnpm start`。
- seed 当前补齐 6 个 Agent、6 个病症、8 对关联、8 个疗法和 9 对推荐，不填预约或真实反馈。所有新增内容整体提交或回滚。
- 无登录或权限隔离；“员工页面”是用途而非访问控制。其他操作系统和原生模块安装路径未验证，不宣称跨平台可用。
- 本地数据库、依赖、构建产物和 work 内证据均不上传；迁移与 seed 能重建示例，不能恢复真实录入数据。

课程最后一节 [Agents replaceability](https://github.com/https-deeplearning-ai/sc-spec-driven-development-files/blob/main/Video14_Agents_replaceability/prompts.md) 的实际任务是审查测试缺口。已核对迁移、业务规则、转义、日志和页面测试；后续优先补强独立进程启动失败/退出清理，以及可重复的跨页面浏览器测试。目前这两方面主要依赖已有手动运行记录；未执行其他编码代理的独立复跑，不据此宣称跨代理结果一致。关于页面仍是未承诺候选，本轮不继续扩展。

Spec 驱动开发课程练习。当前实现最小 HTML 首页、可复用布局和本地 PicoCSS；阶段 2 已完成 SQLite 数据基础、示例数据、Agent 列表与详情，以及病症目录。阶段实现、功能验收、代码审查及测试补强已完成，Changelog 已更新。

## MVP 当前进度（2026-10-16）

第 1～4 组已完成：疗法数据、疗法页面、预约创建、员工仪表盘与状态更新；统一错误页与请求日志也已完成，自动串联复核已通过，用户体验已接受，功能验收完成。新增 004 therapies（名称唯一）及 005 ailment_therapies；课程库已有 8 个疗法和 9 对推荐关联。pnpm seed 现报告五类计数，新增内容在同一事务内提交或回滚；不同 ID 的同名疗法会报错，不按名称自动复用。旧 Agents、病症及关联完整保留，重复执行不增加副本。以下阶段 2 记录保留其当时状态；最新规格见 specs/2026-10-16-mvp/，当前 85 项测试及类型、构建、格式检查通过。

/therapies 提供名称与描述两列表格，可从“疗法”导航进入；Agent 详情展示去重推荐疗法的名称、描述及匹配病症。无病症与有病症但无匹配疗法分别提示。两页三档视口已验证，浏览不会修改数据库。

有推荐疗法的 Agent 详情提供“创建预约”：选择推荐疗法、固定治疗师和北京时间，预约限未来整点或半点、固定 30 分钟。同 Agent 或治疗师撞期及重复提交返回冲突，成功跳转确认页。启动时新增 006 appointments 自动迁移，不填预约示例；本轮验证仅使用隔离库，正常库下次启动才应用此迁移。

/dashboard 显示三项统计，默认显示有效预约（待开始与进行中），可查看全部历史。仅开始前可确认取消；开始时刻起不能取消，30 分钟后自动显示已结束，不再提供人工完成。状态按服务器时间读取计算，刷新更新。预约编号与有效数量明确区分，取消后重约产生新编号。旧 completed 历史不重新激活。员工页面仍无登录或权限隔离。

未知页面/记录返回 HTML 404，内部异常返回简洁 HTML 500。终端逐请求输出 JSON：method、path、status、durationMs；不记录查询字符串、表单、请求头或堆栈。500 不自动重试，提交操作后遇错应先核对预约记录。

## 环境与安装

已验证 Windows、Node.js 24.19.0、pnpm 11.25.0。依赖精确版本见 pnpm-lock.yaml。

本机 PowerShell 可使用已有 pnpm：

```powershell
Set-Location 'D:\learning-projects\AgentClinic'
$env:Path = 'C:\Users\jiaxiang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
$pnpm = 'C:\Users\jiaxiang\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd'
& $pnpm install --frozen-lockfile
& $pnpm run dev
```

默认地址：http://127.0.0.1:3000/。在启动终端按 Ctrl+C 停止。可通过 PORT 环境变量指定其他端口；服务只监听本机。

从导航进入 /agents 查看名称、模型类型和状态，按名称及 ID 排序。数据来自当前数据库的实时查询；未运行 seed 的空库显示“暂无 Agent”。列表名称链接到 /agents/:id，详情显示资料与该 Agent 的病症，提供返回列表链接；无关联时显示“暂无已记录病症”。访问不填充或修改数据。无效或不存在的编号返回 404；/ailments 以两列表格展示全部病症名称与描述（含尚未关联 Agent 的病症），按名称和 ID 排序；空库显示“暂无病症”，导航通过“病症”进入。

其他环境需具备 Node.js 24 和 pnpm 11，然后使用 pnpm install --frozen-lockfile、pnpm run dev 等命令。

## 检查与生产启动

```powershell
& $pnpm run typecheck
& $pnpm run build
& $pnpm test
& $pnpm run format:check
& $pnpm start
```

逐项确认检查退出码为 0。start 运行 dist/index.js，需先构建；先关闭同端口的开发服务，避免冲突。按 Ctrl+C 停止生产服务。

## 数据库初始化

开发和生产启动都会先打开 SQLite，执行尚未应用的迁移，成功后才监听 HTTP。迁移失败会报错退出，正常退出时关闭连接。

默认数据库固定为项目根目录的 agentclinic.db，本机位置是 D:\learning-projects\AgentClinic\agentclinic.db；从其他目录启动也不会生成到别处。该文件及 .db-* 附属文件由 Git 忽略。DATABASE_PATH 可以指定其他文件：绝对路径直接使用，相对路径从项目根目录解析，父目录须已存在。测试使用 work 下独立临时目录，完成后清理。

当前已有三份迁移：001 创建 agents，包含 id、name、model_type、status、created_at，状态限定为 active、on_leave、discharged；002 创建 ailments，保存 id、name、description；003 创建 agent_ailments，用 agent_id 与 ailment_id 的组合主键记录多对多关系。

关联两端必须存在，同一对关联不能重复；仍被引用的 Agent 或病症不能直接删除。_migrations 记录成功应用的文件，sqlite_sequence 是 SQLite 为自增主键维护的内部表。

后续 SQL 放入 src/db/migrations，按 001_名称.sql 这样的编号顺序执行。每份 SQL 与其成功记录共同提交或回滚；已应用的文件会跳过，不修改其原文，后续变化添加新文件。不要在迁移 SQL 中自行 BEGIN、COMMIT 或 ROLLBACK。

pnpm build 同时复制迁移 SQL 到 dist/db/migrations；运行构建产物时需保留这个目录。SQL 中途失败时停止本次启动，此前已完成的迁移保留；修复尚未成功的文件后重新启动。

## 课程示例数据

普通开发、生产启动只迁移表结构，不填入演示数据。需要课程示例时，在项目根目录明确执行：

```powershell
& $pnpm seed
```

这就是 pnpm seed；沿用上文设置的 pnpm 路径。命令先迁移，再按顺序补齐课程的 6 个虚构 Agent、6 个病症和 8 对关联，随后关闭连接。因此全新数据库也能直接运行。它与服务启动使用相同的 DATABASE_PATH 规则；构建后也可执行 node dist/db/run-seed.js，无需启动 HTTP。

空库首次运行分别新增 6 个 Agent、6 个病症、8 对关联；再次运行均新增 0，分别跳过 6、6、8。实体固定 ID 1～6 或同一对关联已存在时跳过，不覆盖已有字段、Agent 创建时间或额外合法关系；缺失示例会补齐。固定 ID 只用于本课程演示，不作为生产数据导入规则。

一次 seed 在同一外层事务内处理三张业务表。即使最后一条关联写入失败，也撤回本次新增的 Agent、病症和关联，保留执行前数据；已经成功完成的表结构迁移仍保留。只跳过指定主键的重复，其他约束错误正常报错，命令退出码非零。成功后才报告三类数量，成功和失败都会关闭连接。

2026-10-15 已用正式命令更新本机默认数据库：原有 6 个 Agent 全部字段保持不变，新增 6 个病症和 8 对关联，无测试记录。数据库文件不纳入 Git；其他机器通过迁移文件和 seed 命令复现。

## 文件职责

- src/app.tsx：通过 createApp 接收已迁移的数据库连接，组合 Hono 路由及样式资源；导入时不打开默认数据库。
- src/pages/Home.tsx：首页标题和简介内容，通过 Layout 组合成完整页面。
- src/components：Layout 接收页面标题和 children，组合共享 Header、Main、Footer；Main 提供唯一的正文区域。
- src/components/AgentsList.tsx：三列服务端 JSX 列表和空状态，文本正常转义。
- src/components/AgentDetail.tsx：资料、关联病症、明确空状态及返回链接。
- src/routes/agents.tsx：只读查询列表、单个 Agent 与对应病症；校验 ID，每次请求读取当前数据。
- src/routes/ailments.tsx：实时只读查询全部病症，按名称和 ID 排序。
- src/components/AilmentsList.tsx：两列病症表格、空状态与可键盘访问的滚动区域。
- src/db/types.ts：Agent 与病症查询、组件共用的记录类型。
- public/styles.css：品牌配色与自定义样式，运行构建产物时也需要保留 public 目录。
- @picocss/pico：固定 2.1.1 的 classless 基础样式，通过 /vendor/pico.classless.min.css 提供；页面先加载它，再加载 /styles.css，不依赖外部 CDN。
- src/index.ts：启动前迁移，随后创建应用、监听服务并处理关闭，不调用 seed。
- src/db/index.ts：打开指定 SQLite 文件并启用外键约束。
- src/db/migrate.ts：按序执行 SQL，维护迁移记录和事务。
- src/db/migrations/001_create_agents.sql：创建 Agents 表与字段约束。
- src/db/migrations/002_create_ailments.sql、003_create_agent_ailments.sql：创建病症与关联表，保证组合唯一和引用有效。
- src/db/seeds/agents.ts：定义课程示例，按固定 ID 补齐并保留已有记录。
- src/db/seeds/ailments.ts、agent-ailments.ts：定义课程病症和关联，按主键补齐。
- src/db/seed.ts：统一执行三类填充，保证一次 seed 整体提交或回滚。
- src/db/run-seed.ts：独立命令入口，先迁移再填充，报告数量并关闭连接。
- scripts/copy-migrations.mjs：构建时交付迁移 SQL，并清除构建目录中残留的旧 SQL。
- tests：首页响应、共享布局和未实现资源的行为测试。
- tests/database.test.ts：用隔离数据库验证持久化、重复执行和失败回滚等关键行为。
- tests/agents.test.ts：验证实际建表、字段约束、示例数据、重复填充、已有记录保留与失败回滚。
- tests/ailments.test.ts：验证增量迁移、病症与关联约束、多对多查询、补齐及跨表整体回滚。
- tests/agents-list.test.ts：用独立内存数据库验证空状态、排序、实时读取、转义和只读行为；请求测试不打开正常数据库。
- tests/agent-detail.test.ts：详情内容、关联隔离、无病症、无效/不存在 ID、转义和只读验证。
- tests/ailments-list.test.ts：目录空状态、名称与描述、排序、未关联记录、转义、导航和只读行为。
- specs：项目约定、功能规格与验收记录。

pnpm-workspace.yaml 将依赖存储限定在 work/pnpm-store，并只允许 esbuild 的安装脚本。better-sqlite3 固定 13.0.3，附带的预编译模块已在当前 Windows x64、Node.js 24 环境验证，因此明确禁用其安装时构建；类型定义固定 @types/better-sqlite3 9.6.0。node_modules、dist、work 和本地数据库不纳入 Git。

生产运行需要 dist、public 和已安装的生产依赖；只开放 PicoCSS 的指定样式文件，不开放整个 node_modules。后续维护状态说明见 specs/tech-stack.md。

Agent 列表完成后，类型检查、构建、41 项测试及格式检查通过。开发/生产入口的首页、列表与本地 CSS 均已实际验证；375×812、768×1024、1440×900 浏览器检查通过，页面无横向溢出，手机状态可读，导航与表格区域键盘焦点可见。表格文字优先换行，容器保留必要时局部滚动的能力。

详情页已完成，当前共 53 项测试及类型、构建、格式检查通过；三档详情布局、列表往返、键盘焦点与无病症提示验证通过。病症目录完成后，共享导航为首页、Agents 和病症；56 项测试及类型、构建、格式检查通过，目录三档布局、导航、空状态与键盘焦点已验证。阶段实现、功能验收、代码审查及测试补强已完成，Changelog 已更新。详情验证使用隔离数据库，正常演示文件校验值不变，临时服务与数据库已清理。分组范围和验收记录见 specs/2026-10-15-agents-ailments；未部署、未推送远程。


## 合并前变更日志

在本项目上下文中手动调用 $agentclinic-changelog。技能文件位于 .agents/skills/agentclinic-changelog/SKILL.md，按日期维护 CHANGELOG.md；不自动提交或合并。若当前会话尚未发现新技能，可明确要求读取该文件并按其步骤执行，不声称菜单已经自动刷新。
