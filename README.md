# PJ1 SVG CLI 编辑器

TypeScript 面向对象课程项目。完整架构、AI 协作记录和验收状态见 [doc/README.md](doc/README.md)。

## 当前状态

第二部分：六种图形和文档模型已实现，包括嵌套变换、属性白名单、唯一 id、分组/解组、归属与顺序调整、子树删除和深复制。可用演示脚本和测试审阅。

CLI 当前仍只提供 `help`、空行/注释处理及错误反馈；模型操作尚未接入 CLI。编辑命令和撤销重做在第三部分实现，SVG 文件读写在第五部分实现。

## 在 VS Code 中运行

需要 Node.js、npm 和 Git。建议与本次验证环境一致使用 Node.js 24.x（本次为 24.13.0、npm 11.6.2）；其余支持版本见 package.json 的 engines，已与测试工具要求对齐。

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
npm test            # Vitest 模型行为测试
npm run demo:model  # 运行六种类型、递归变换、分组和错误原子性演示
npm run check       # 源码及测试类型检查 + 构建 + 全部测试
```

VS Code“终端 → 运行任务”还提供“测试领域模型”和“演示领域模型”；F5 仍启动 CLI。测试包括数值边界、嵌套组、重复 id、防环、结构顺序、失败状态不变及快照隔离。

## 分阶段审阅

每部分完成后停止，用户审阅通过后继续。第一部分已获用户同意继续，当前待审阅第二部分。尚未建立远程仓库，也未打最终 `final` 标签。

本次可检查：

1. 阅读 `doc/README.md` 的“第二部分模型实现说明”，重点检查类层次与结构操作的规则。
2. 在 VS Code 终端运行 `npm.cmd run demo:model`。应看到矩形位置从 (10,20) 变为 (20,15)、宽高变为 50×25；原快照 x 仍为 10。
3. 检查演示中的分组顺序为 dot、oval，以及错误后 `Document unchanged after error: true`。
4. 执行 `npm.cmd run check`，检查类型、构建和全部模型测试。
5. 源码阅读入口：`src/domain/shapes/Shape.ts`、`GeometryShape.ts`、`Group.ts`、`src/domain/SvgDocument.ts`；测试位于 `tests/unit/`。

`init/create/move` 等 CLI 命令此时尚未注册，会报告未知命令。审阅通过后，第三部分将连接命令、编辑器会话和撤销重做。VS Code 可见窗口及快捷键仍需用户本机确认。
