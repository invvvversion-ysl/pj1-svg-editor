# PJ1 SVG CLI 编辑器

TypeScript 面向对象课程项目。完整架构、AI 协作记录和验收状态见 [doc/README.md](doc/README.md)。

## 当前状态

第四部分：结构与属性显示已完成。当前命令：`init`、`canvas`、`create`（含 `in`）、`delete`、`move`、`scale`、`set`、`group`、`ungroup`、`addto`、`front`、`back`、`tree [id]`、`show <id>`、`undo`、`redo`、`help`。

tree 支持全文档和子树，内联关键几何属性；show 列出单个图形的父级、几何字段、文本和显式样式。所有查询均不改变文档、撤销栈、重做栈或历史屏障。SVG 文件读写留到第五部分。

整个工程集中在本目录 `svg-editor/`：源码、文档、测试、示例、配置、锁文件和本地 Git 历史均在其中。依赖通过 npm 安装，无需外部 work 目录中的文件。按用户要求，完成全部阶段后再配置和推送远程仓库。

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
npm test            # Vitest 单元与集成测试
npm run demo:model  # 运行六种类型、递归变换、分组和错误原子性演示
npm run demo:commands # 回放第三部分的编辑与撤销重做命令示例
npm run demo:views  # 回放第四部分的结构树、属性显示和查询历史示例
npm run check       # 源码及测试类型检查 + 构建 + 全部测试
```

VS Code“终端 → 运行任务”提供“运行全部测试”“演示领域模型”“演示编辑与撤销重做”“演示结构树与属性”；F5 启动 CLI。当前 10 个测试文件共 294 项测试通过，覆盖模型、分词、命令、历史、格式化、查询隔离和示例回放。

输入约定：只有行首（允许前导空白）的 # 才是注释，颜色 #4a90d9 可以直接作为参数。双引号内用 `\"` 和 `\\` 表示引号和反斜杠，其他反斜杠保留，因此 Windows 路径中的 `\t` 不会变为制表符。init 缺省宽高分别为 800/600；canvas 无参查询，修改时必须同时提供宽高。

## 分阶段审阅

每部分完成后停止，用户审阅通过后继续。前三部分已获用户同意继续，当前待审阅第四部分。尚未配置远程仓库，也未打最终 `final` 标签。

本次可检查：

1. 阅读 `doc/README.md` 的“第四部分查询与显示实现说明”。
2. 在 VS Code 终端运行 `npm.cmd run demo:views`。可看到六种图形、嵌套树、子树、父级与属性；本示例不包含预期错误。
3. 检查示例中撤销后执行查询，仍可 redo；show c1 中 cx 依次为 100、100、130。空标题显示为双引号空串。
4. 执行 `npm.cmd run cli`，手动输入下面的最小会话，或查看 `examples/stage4.txt`。
5. 执行 `npm.cmd run check`，检查类型、构建和全部测试。
6. 源码阅读入口：`src/application/ports/DocumentPresenter.ts`、`src/presentation/TextDocumentPresenter.ts`、`src/presentation/ShapeFormatter.ts`；查询测试位于 `tests/unit/` 和 `tests/integration/QueryWorkflow.test.ts`。

```text
init
create g markers
create circle c1 100 100 20 red in markers
tree
show c1
move c1 30 0
undo
tree markers
show c1
redo
show c1
```

最后一次 show c1 应显示 `cx=130 cy=100 r=20`。show 的父级为 g#markers；对 SVG 直接子节点则显示 parent=svg。只显示显式样式，不把继承值或省略的默认 fill/stroke 补进模型。

当前 `read/save` 尚未注册，使用它们会报告未知命令。审阅通过后再开始第五部分的 SVG 文件读写。VS Code 界面操作及快捷键仍需用户本机确认；后台终端运行与编译验证已完成。
