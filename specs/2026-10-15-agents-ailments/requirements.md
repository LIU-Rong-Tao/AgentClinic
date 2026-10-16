# Agents 与病症：需求规格

## 目标与范围

对应 roadmap.md 的阶段 2，建立诊所的第一组真实内容：共享布局、SQLite 数据基础、Agent 列表与详情、病症目录及关联。继续使用 Node.js、TypeScript、Hono 服务端 JSX、better-sqlite3 和普通 SQL。

第 1～4 组、第 5a 列表及第 5b 详情已完成并验证。第 6 组病症目录也已完成并验证，本轮停止于此；阶段实现、功能验收、代码审查及测试补强已完成，Changelog 已更新。

## 第 1 组：共享布局（已完成）

- 复用 Header、Main、Footer 与 Layout；Layout 接收必填的页面标题和页面内容，Main 负责唯一的主内容区，页面内容由调用方提供。
- 有输入的组件分别在其文件中声明独立命名的 Props `type`，遵守 tech-stack.md，不添加空类型或没有实际用途的参数。
- 将现有首页内容移入 `src/pages/Home.tsx`，通过共享 Layout 渲染。保留 AgentClinic 品牌标题、幽默简介和指定英文营业提示。
- 页面包含完整文档结构、中文语言声明、字符编码、viewport 与可区分页面的文档标题。不得出现嵌套或重复的 main。
- 按用户选项跟随课程引入 PicoCSS classless 基础样式，并用项目 CSS 保留浅底、近黑正文与橙色强调。固定 npm 依赖版本 2.1.1；浏览器先加载本地 PicoCSS，再加载品牌 CSS，不依赖外部 CDN。
- PicoCSS 仅通过 `/vendor/pico.classless.min.css` 这个明确的静态资源地址提供；现有 `/styles.css` 保持可用，不开放整个 node_modules 目录。
- Header 提供可识别的主导航，本轮仅有“首页”链接 `/`。Agent 和病症入口随真实页面实现再加入，不提供占位链接。
- 首页及样式在开发入口和构建产物中均可访问；手机、平板、桌面三档可读、无意外横向溢出。文字对比度维持至少 4.5:1，导航可以通过键盘访问且焦点可见。

## 第 2 组：数据库初始化（已完成）

- 沿用 better-sqlite3 与普通 SQL，提供显式打开数据库的入口；导入页面或数据库模块本身不创建数据库文件。每个连接开启外键约束。
- 默认数据库固定为项目根目录的 `agentclinic.db`，不随启动工作目录变化。本机位置为 `D:\learning-projects\AgentClinic\agentclinic.db`。支持 `DATABASE_PATH` 指定隔离数据库，绝对路径直接使用，相对路径基于项目根目录解析，父目录须已存在。
- 服务启动前自动迁移，成功后才监听 HTTP；打开数据库或迁移失败时明确报错，不继续启动服务。退出时关闭数据库连接。
- `src/db/migrations/` 保存按文件名排序的普通 SQL 文件；以 `_migrations` 表记录文件名与应用时间，已应用的文件跳过。第 2 组完成时该目录尚无业务 SQL，空目录仍能初始化迁移记录表。
- 每份 SQL 的执行与成功记录放在同一事务中。失败时回滚该文件内的修改与记录，停止后续文件；此前已成功提交的文件保留。
- 迁移文件由执行器管理事务，不在 SQL 文件内另写 BEGIN、COMMIT 或 ROLLBACK；已应用文件保持不变，后续表结构变化新增编号文件。
- 构建时将迁移 SQL 一并交付到 dist，避免开发成功而生产构建缺少资源。缺失迁移目录应报错，不能被当作空目录忽略。
- 数据库文件及其附属文件不提交到 Git。测试仅使用 work 下独立临时目录，验证后关闭连接并清理；正常数据库不得被测试创建业务表或写入测试记录。
- 本组不创建 agents、ailments 或 agent_ailments 表，不插入种子数据、不增加业务页面、不提交或合并。

## 第 3 组：Agents 表与示例数据（已完成，2026-10-15）

- 新增 `001_create_agents.sql`，沿用课程的五个字段：id 为自增整数主键；name、model_type、status、created_at 均 NOT NULL；status 仅允许 active、on_leave、discharged；created_at 默认由 SQLite 的 datetime('now') 生成。
- 不增加名称唯一、模型枚举等课程之外的业务限制。模型类型仅为演示标签，不调用外部模型服务。
- 沿用课程 6 个虚构 Agent 及固定 ID 1～6：Bartholomew-47B、Penelope-mini、Reginald-7B、Agatha-nano、Cornelius-7B、Hildegard-4B，保留课程对应的模型标签与状态。
- 按用户选择，独立执行 `pnpm seed` 才填入示例。命令先迁移再填充，因此可直接用于新数据库；普通开发、生产启动只迁移，不自动 seed。
- seed 使用同一 DATABASE_PATH 规则。固定 ID 已存在则跳过，不覆盖其名称、模型、状态或创建时间；其他 ID 的记录也保持不变。重复执行不增加副本，缺失的示例可以补齐。这是课程演示 ID 约定，不扩展为生产数据导入规则。
- 只忽略 ID 重复，其他数据库约束错误仍报错。整批 seed 放入同一事务，失败时回滚本批新增记录，保留此前数据；已完成的表结构迁移不回滚。
- 命令输出本次新增与跳过数量，完成或失败后均关闭数据库，失败返回非零退出码。测试在 work 隔离目录执行，正常数据库只在验证通过后通过正式命令填入课程示例。
- 本组不创建 ailments、agent_ailments、业务页面或路由，不更改导航，不提交、合并或推送。

## 第 4 组：病症表与关联（已完成，2026-10-15）

- 新增 `002_create_ailments.sql`：id 为自增整数主键，name、description 均 NOT NULL。沿用课程字段，不增加严重程度、诊断日期、名称唯一或编辑功能。
- 新增 `003_create_agent_ailments.sql`：agent_id、ailment_id 均 NOT NULL，分别引用 agents.id、ailments.id，以二者组合为主键。同一对关联只能存在一次；一个 Agent 可以对应多个病症，一个病症也可以对应多个 Agent。
- 所有关联对象必须存在；沿用课程未设置级联删除的外键行为，不能直接删除仍被引用的 Agent 或病症。本组只验证约束，不提供删除入口。
- 保留已应用的 001 迁移，新增迁移不改变已有 Agent 的任何字段。新数据库和仅完成第 3 组的数据库都可以继续初始化；普通启动仍只迁移表结构。
- 沿用课程 6 个病症及英文描述，固定 ID 1～6 依次为 Context-Window Claustrophobia、Prompt Fatigue、Hallucination Anxiety、Chronic Instruction-Following Fatigue、Over-Summarization Syndrome、Temperature Instability。
- 沿用课程 8 对关联：1→1/2，2→3，3→4，4→5，5→6，6→1/3；箭头左侧为 Agent ID，右侧为病症 ID。
- 独立 pnpm seed 按 Agents、病症、关联的顺序补齐数据。已有实体 ID 或同一对关联跳过，其他记录及已有字段保持不变；不使用替换或删除重建。固定 ID 仍是课程演示约定。
- 按用户选择，一次 seed 中三张业务表的新增内容在同一外层事务内执行。任一步失败，包括关联写到一半时失败，都撤回本次在三张表中的新增内容，保留执行前的数据；已完成的迁移不回滚。错误不能被吞掉，命令以非零码退出并关闭连接。
- 仅针对实体主键或关联组合主键忽略重复，其他 NOT NULL、外键或约束错误仍报错；成功后分别报告三类数据的新增和跳过数量。
- 隔离测试验证通过后，才在正常数据库运行正式 seed。正常数据库预期保留原有 6 个 Agent，新增 6 个病症、8 对关联，不包含测试记录、索引或触发器。
- 本组不增加依赖、业务页面、路由、导航、疗法或预约，不提交、合并或推送。

## 第 5a 组：Agent 列表页（已完成，2026-10-15）

- 实现 GET /agents，通过 SQLite 实时查询全部 Agent，按 name、id 升序排列，不写死示例数据；仅展示名称、模型类型和状态。状态沿用课程英文，on_leave 显示为 on leave。
- 按用户选择使用三列表格，复用共享 Layout、本地 PicoCSS 和既有浅底橙黑配色；独立页面标题，表头明确标识三列。名称先用普通文字，不提供未实现的详情链接。
- 共享导航加入真实的 /agents 入口，可在首页与列表间往返；不加入病症目录入口。
- 空表返回 200 和“暂无 Agent”的正常空状态，不假装数据库报错，也不自动 seed。数据查询失败不得伪装成空列表。
- 路由使用启动时已迁移的数据库连接；导入模块不打开默认数据库。测试显式注入隔离数据库，允许使用内存数据库验证请求，不污染正常演示文件。
- 每次请求重新读取数据，只读查询不改变 Agents、病症或关联；数据库文本通过 JSX 正常转义，不作为 HTML 执行。
- 表格文字优先换行；必要时只允许表格容器局部横向滚动，该区域可用键盘操作。375×812、768×1024、1440×900 下页面本身无横向溢出，导航焦点与主要文字可见、可读。
- 不增加筛选、搜索、分页、排序控件或编辑功能；不实现 /agents/:id、/ailments，不新增依赖，不提交、合并或推送。

## 第 5b 组：Agent 详情页（已完成，2026-10-15）

- GET /agents/:id 展示名称、模型类型、状态及当前 Agent 关联的病症名称与描述，病症按名称、ID 排序；复用共享 Layout，使用独立文档标题。
- 列表名称链接到真实详情；详情提供“返回 Agent 列表”。
- 按用户选择，保留“已记录病症”区域，没有关联时显示“暂无已记录病症”；不将缺少记录解释为健康。
- ID 只接受无前导零的正十进制安全整数；无效或不存在的 ID 返回 404，不伪装成空资料。采用参数化 SQL，只读查询且文本经 JSX 转义。
- 验证多个病症、不同 Agent 间数据隔离、无病症、无效/不存在 ID、转义与三表数据不变；三档视口可读、无页面横向溢出，链接可键盘操作。
- 不增加病症目录、编辑、预约、依赖、表结构或种子数据；不提交、合并或推送。

## 第 6 组：病症目录（已完成，2026-10-15）

- GET /ailments 实时读取全部病症，按 name、id 升序排列，展示名称与描述，不依赖是否已关联 Agent。
- 按用户选择沿用课程两列表格，复用 Layout 和本地样式；共享导航增加“病症”入口。
- 空库返回 200 和“暂无病症”，不自动填充数据；查询失败不能伪装为空列表。
- 仅只读查询，数据库文本由 JSX 转义；不增加详情、关联人数、编辑、搜索或分页，不改变表结构和种子数据。
- 长文字换行，必要时仅表格区域横向滚动且可键盘操作；三档视口页面不溢出，导航可往返、焦点可见。
- 本步不提交、合并或推送，阶段整体复核另行进行。

## 阶段 2 后续业务范围

- SQLite 迁移由普通 SQL 文件定义并记录执行状态，重复执行不得产生重复迁移错误。
- agents 记录名称、模型类型、状态；沿用课程的 active、on_leave、discharged 状态。ailments 记录名称与描述，通过 agent_ailments 表保存多对多关联。
- 使用至少 5 个虚构 Agent、至少 5 个虚构病症及关联作为演示数据；重复运行种子脚本不重复插入。
- `/agents` 展示名称、模型类型和状态，用户可以进入真实详情；`/agents/:id` 展示资料及对应病症，不存在的记录返回 404。
- `/ailments` 展示病症名称与描述。所有已实现页面复用布局，导航链接与页面进度同步。
- 进入数据与路由小步时再细化初始化、空数据及无效标识等行为，按共同测试策略验收。

## 不包含

疗法、预约、员工仪表盘、登录、编辑或删除业务数据、外部接口和部署。当前小步只增加病症目录及共享导航，不改变数据库结构或示例数据。

## 课程依据与适配

- [课程仓库说明](https://github.com/https-deeplearning-ai/sc-spec-driven-development-files/blob/main/README.md)：每个视频目录保存该视频的开始状态，因此本节完成后的规格位于下一节起点目录。
- [阶段 2 需求](https://github.com/https-deeplearning-ai/sc-spec-driven-development-files/blob/main/Video11_The_MVP/specs/2026-03-31-agents-ailments/requirements.md)
- [阶段 2 计划](https://github.com/https-deeplearning-ai/sc-spec-driven-development-files/blob/main/Video11_The_MVP/specs/2026-03-31-agents-ailments/plan.md)

保留课程项目与技术路线；复用本项目已有布局和品牌，以本地 npm 资源代替课程示例中的 CDN。沿用已确认的 375×812、768×1024、1440×900 验收视口。本文是中文适配规格，不是课程逐字翻译。

第 3 组沿用[课程建表文件](https://github.com/https-deeplearning-ai/sc-spec-driven-development-files/blob/main/Video11_The_MVP/src/db/migrations/001_create_agents.sql)与[课程示例数据](https://github.com/https-deeplearning-ai/sc-spec-driven-development-files/blob/main/Video11_The_MVP/src/db/seed.ts)中的 Agents 部分。课程示例使用 INSERT OR IGNORE；本项目使用针对 id 的 ON CONFLICT DO NOTHING，仅跳过重复 ID，避免同时忽略其他约束错误。普通 SQL、固定 ID 和保留已有记录的语义不变。

第 4 组沿用课程的 [002 病症表](https://github.com/https-deeplearning-ai/sc-spec-driven-development-files/blob/main/Video11_The_MVP/src/db/migrations/002_create_ailments.sql)、[003 关联表](https://github.com/https-deeplearning-ai/sc-spec-driven-development-files/blob/main/Video11_The_MVP/src/db/migrations/003_create_agent_ailments.sql)和上述 seed 中的病症与关联。跨三张表整体回滚是本次问答确认的补充规则，课程示例未显式设置这个外层事务。

第 5a 组对应课程 Group 5 的列表部分，沿用[查询路由](https://github.com/https-deeplearning-ai/sc-spec-driven-development-files/blob/main/Video11_The_MVP/src/routes/agents.tsx)和[三列组件](https://github.com/https-deeplearning-ai/sc-spec-driven-development-files/blob/main/Video11_The_MVP/src/components/AgentsList.tsx)。按本次范围暂不复制详情链接；补充空状态、同名记录按 ID 稳定排序和本项目三档视口验收。
