# PJ1 Phase 1 提交说明

## 提交内容

1. GitHub 私有仓库：`https://github.com/invvvversion-ysl/pj1-svg-editor`。保留各阶段开发历史，最终版本标记为 `final`。
2. 项目文档：仓库中的 `doc/README.md`，含架构及 PlantUML、真实 AI 协作记录、一致性自查、功能矩阵和质量保证证据。
3. 如课程平台要求附件，提供 `release/pj1-svg-editor-final.zip`；它解压后只有一个 `svg-editor/` 根目录。`release/pj1-svg-editor-history.bundle` 另外保存 Git 历史，可作备份。

本题已提供的要求未明确课程平台入口或截止时间，请按课程通知在截止前提交仓库链接和指定附件。私有仓库需要在 GitHub 的 Settings → Collaborators 中给予教师/助教访问权限；其账号尚未提供，程序不会自动邀请他人。

## 本地验收

在含 package.json 的目录执行：

```text
npm ci
npm run check
npm run demo:svg
npm run cli
```

检查 help、tree/show、编辑和 undo/redo；打开 examples/generated/flowchart.svg。示例的三条错误和一条补 id 警告为有意验证，演示最终应成功结束。安装依赖与编译产物不需纳入源码提交。

## 上传

先在自己的终端完成 `gh auth login --hostname github.com --git-protocol https --web`。从项目目录运行：

```powershell
& .\scripts\PublishGithub.ps1 -GhPath "D:\Dev\Tools\Github CUL\gh.exe"
```

脚本核对账号、工作区及 final 标签，创建私有仓库或确认已有仓库为私有，再以原子推送上传 main 与 final；无强制覆盖。Git 凭据助手仅对该次 Git 命令配置，不修改全局设置，也不把凭据写入仓库。若已有不兼容的远程历史，停止并人工核对。

成功后核对以下链接（上传前这些地址可能不存在）：

- 仓库：`https://github.com/invvvversion-ysl/pj1-svg-editor`
- 最终标签：`https://github.com/invvvversion-ysl/pj1-svg-editor/tree/final`
- 文档：`https://github.com/invvvversion-ysl/pj1-svg-editor/blob/final/doc/README.md`

仓库的 Actions 提供 Windows/Ubuntu、Node 24 验证。配置存在不代表云端执行已通过，应以 Actions 的实际结果为准。

## 归档与恢复

在干净工作区、final 指向 HEAD 后运行 `npm run package`。release/ 中生成源码 ZIP、历史 bundle、SHA256SUMS.txt 和 manifest.json；清单记录实际提交和文件哈希。最终现场核验记录另见 release/DELIVERY.md。

从历史备份恢复到一个新的空目录：

```text
git clone pj1-svg-editor-history.bundle svg-editor-restored
cd svg-editor-restored
git checkout final
npm ci
npm run check
```
