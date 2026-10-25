# PJ1 SVG CLI 编辑器

TypeScript 面向对象课程项目。完整架构、AI 协作记录和验收状态见 [doc/README.md](doc/README.md)。

## 当前状态

第五部分：SVG 文件读写已完成，PJ 要求的 19 条命令均已接入。当前命令：`init`、`read`、`save`、`canvas`、`create`（含 `in`）、`delete`、`move`、`scale`、`set`、`group`、`ungroup`、`addto`、`front`、`back`、`tree [id]`、`show <id>`、`undo`、`redo`、`help`。

read 在解析、id 和模型校验全部成功后替换文档，缺 id 时自动补全并警告；save 无参数时使用最近读取/保存的路径。成功的文档操作清空历史并建立屏障，失败保留文档、路径和历史。支持的 SVG 子集与规范化规则见下文及 doc/README.md。

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
npm test            # 先构建，再运行 Vitest 单元、集成与真实 CLI 进程测试
npm run demo:model  # 运行六种类型、递归变换、分组和错误原子性演示
npm run demo:commands # 回放第三部分的编辑与撤销重做命令示例
npm run demo:views  # 回放第四部分的结构树、属性显示和查询历史示例
npm run demo:svg    # 回放 PJ 流程图、SVG 保存/读取及缺 id 示例
npm run check       # 源码及测试类型检查 + 构建 + 全部测试
```

VS Code“终端 → 运行任务”另提供“演示 SVG 文件读写”；F5 启动 CLI。当前 14 个测试文件共 368 项测试通过，涵盖之前全部功能，以及 SVG 往返、真实文件失败恢复、PJ 会话和异步 IO/EOF 回归。

输入约定：只有行首（允许前导空白）的 # 才是注释，颜色 #4a90d9 可以直接作为参数。双引号内用 `\"` 和 `\\` 表示引号和反斜杠，其他反斜杠保留，因此 Windows 路径中的 `\t` 不会变为制表符。init 缺省宽高分别为 800/600；canvas 无参查询，修改时必须同时提供宽高。

## 分阶段审阅

每部分完成后停止，用户审阅通过后继续。前四部分已获用户同意继续，当前待审阅第五部分。尚未配置远程仓库，也未打最终 `final` 标签；最终验收与打包留到第六部分。

本次可检查：

1. 阅读 `doc/README.md` 的“第五部分 SVG 文件实现说明”和“功能完整性验收矩阵”。
2. 在 VS Code 终端运行 `npm.cmd run demo:svg`。示例刻意触发 3 条错误（两次历史屏障、一次缺失文件），以及 1 条补 id 警告；这些不是验收失败。
3. 打开 `examples/generated/flowchart.svg`：8 个元素，包含“开始”和“处理数据 v2”。打开 `examples/generated/imported.svg`：7 个元素，c1 的 cx=55，补齐的 rect1 再次读入无需警告。
4. 执行 `npm.cmd run cli`，手动输入下方会话，或查看 `examples/stage5.txt`；脚本不会覆盖 examples/input 中的原始输入。
5. 执行 `npm.cmd run check`，检查类型、构建和全部测试。
6. 源码阅读入口：`src/application/commands/ReadCommand.ts`、`SaveCommand.ts`、`src/infrastructure/SvgCodec.ts`、`SvgFileRepository.ts`、`src/domain/ShapeFactory.ts`；文件测试位于 `tests/integration/SvgFiles.test.ts`，真实进程回归位于 `CliProcess.test.ts`。

```text
init
create rect r1 10 20 100 50 #4a90d9
save demo.svg
undo
read demo.svg
tree
move r1 30 0
save
```

save 后的 undo 应报告 `error: undo not allowed after io command`。read 后成功编辑即可建立新历史；最后的无参数 save 写回 demo.svg。

示例输出可直接在本机浏览器打开 SVG 预览；也提供 `examples/generated/flowchart-preview.png` 作为本阶段本地渲染检查快照。PNG 不替代 SVG，也不会在每次 demo:svg 时自动重建。

## SVG 导入范围

- UTF-8 XML 1.0，内置 rect/circle/ellipse/line/text/g；支持嵌套、公共样式和题目规定的几何属性，text 内容存为子文本。
- 接受 SVG 命名空间及无命名空间输入；保存统一写出标准命名空间。坐标和尺寸支持数字或 px，读入时规范化为数字。
- 保留 viewBox（含非零起点和与画布不同的范围）。缺宽/高时优先使用 viewBox 尺寸，否则分别为 800/600；canvas 修改会重设 viewBox 为 0 0 w h。
- 缺失/空 id 自动补齐，先预留全部显式 id 避免撞名。显式重复或非法 id 报错；读取失败不打印部分补 id 警告。
- 不支持的 path/tspan/transform/CSS/style/font-size、额外根属性、其他长度单位、DTD/外部样式声明等明确拒绝。注释不保留；支持范围内保证结构、顺序、几何、样式、文本的语义往返，不承诺保留原始排版。

VS Code 界面快捷键仍需用户本机确认。第五部分通过后再做最终一致性审计、归档、远程仓库及 final 标签，当前不提前完成这些提交步骤。
