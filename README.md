# PJ1 SVG CLI 编辑器

TypeScript 面向对象课程项目。完整架构、AI 协作记录和验收状态见 [doc/README.md](doc/README.md)。

## 当前状态

第一部分：项目骨架。已提供 CLI 启动、`help`、空行与整行注释处理、未知命令与 help 参数错误反馈。SVG 文档及编辑功能尚未实现。

## 在 VS Code 中运行

需要 Node.js 22 或更高版本、npm 和 Git。本次验证环境为 Node.js 24.13.0、npm 11.6.2。

1. 在 VS Code 中打开本目录（含 `package.json` 的目录）。
2. 打开“终端 → 新建终端”。首次获取项目后执行 `npm ci`。
3. 执行 `npm run cli`，看到 `svg>` 后输入 `help`。
4. Windows 终端中使用 Ctrl+Z 后按 Enter 结束输入；也可用 Ctrl+C 终止进程。

如果 PowerShell 限制运行 `npm.ps1`，使用 `npm.cmd`，例如 `npm.cmd run cli`，无需修改系统执行策略。

VS Code 支持按 F5 选择“运行 SVG CLI”启动调试；Ctrl+Shift+B 构建。启动配置已写入 `.vscode/`，实际快捷键启动仍需用户在 VS Code 中确认。

```text
npm run cli         # 编译 TypeScript 后启动
npm run typecheck   # 严格类型检查
npm run build       # 编译到 dist/
npm start           # 运行已编译版本
npm run check       # 类型检查 + 构建
```

当前没有领域逻辑测试，第二部分开始增加 Vitest 测试；第一部分通过启动与错误恢复冒烟检查验收。

## 分阶段审阅

每部分完成后停止，用户审阅通过后继续。当前待审阅第一部分，尚未建立远程仓库，也未打最终 `final` 标签。

本次可检查：

1. 阅读 `doc/README.md` 中的模块、依赖方向及设计取舍。
2. 在 VS Code 终端运行 `npm.cmd run cli`，依次输入 `help`、`unknown`、`help extra`、`help`，检查错误后可以继续操作。
3. 输入一行 `# comment`，确认忽略；当前 `init` 等命令尚未注册，会报告未知命令。
4. 执行 `npm.cmd run check` 检查类型与构建；按 F5 核对 VS Code 调试是否正常。

第一部分后台验证已通过，VS Code 可见窗口及快捷键尚待用户确认。审阅通过后，第二部分开始实现六种图形和文档模型。
