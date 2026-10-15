# AgentClinic

Spec 驱动开发课程练习。当前实现最小 HTML 首页，包含品牌标题、幽默简介和营业提示。

## 环境与安装

已验证 Windows、Node.js 24.19.0、pnpm 11.25.0。依赖精确版本见 pnpm-lock.yaml。

本机 PowerShell 可使用已有 pnpm：

```powershell
Set-Location 'D:\learning-projects\AgentClinic'
$pnpm = 'C:\Users\jiaxiang\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd'
& $pnpm install --frozen-lockfile
& $pnpm run dev
```

默认地址：http://127.0.0.1:3000/。在启动终端按 Ctrl+C 停止。可通过 PORT 环境变量指定其他端口；服务只监听本机。

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

## 文件职责

- src/app.tsx：Hono 路由及样式资源入口。
- src/components：Layout 与独立 Header、Main、Footer。
- public/styles.css：外部样式，运行构建产物时也需要保留 public 目录。
- src/index.ts：服务监听与关闭。
- tests/home.test.ts：首页响应与内容测试。
- specs：项目约定、功能规格与验收记录。

pnpm-workspace.yaml 将依赖存储限定在 work/pnpm-store，并只允许 esbuild 的安装脚本。node_modules、dist 和 work 不纳入 Git。

当前没有实现数据库或业务入口，阶段 1 已通过功能验证；未部署、未推送远程。
