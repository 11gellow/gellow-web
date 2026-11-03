# 双分支工作区操作规范

权威教学流程见 [原规范](specs/LEARNING_WORKFLOW.md)，此处记录本机配置和恢复方式。

## 已建立（2026-11-04）

| 分支 | 工作目录 | 用途 |
| --- | --- | --- |
| main | G:/python_code/gellow-web | 稳定代码；本轮仅新增文档与本地恢复工具 |
| dev | G:/python_code/gellow-web-dev | 完整参考实现，教学验收前不作最终功能提交 |
| learn | G:/python_code/gellow-web-learn | 开发者练习，禁止生产部署 |

初始化时三个分支 HEAD 均为 6a3b09c，旧分支/历史未变。dev/learn 没有设置远程跟踪，没有推送。初始化文档和恢复工具已显式复制到三个工作区，均为未跟踪文件；本轮未 Commit，所以它们尚不属于任何分支的已提交历史。两份规范原文件字节一致。长期 Git 持久化需日后明确提交这些基础文档，不能声称现在已受提交保护。当前有 .git 内独立快照保护。

Git Worktree 共享提交和分支引用，工作文件、索引、未提交修改不共享。以后不能假设一个工作区的编辑自动同步；当前复制仅因两边新建且无用户修改，后续不重复覆盖。

## 每次开始与同步

1. 在目标目录执行 git status --short --branch、git worktree list、git diff；确认当前任务和分支。不得跨目录误操作 main。
2. 按任务设计小切片，先快照 dev/learn。dev 完整实现 + 正式测试保持未提交；learn 留 1～3 个关联练习，测试与正式测试区分。
3. 向 learn 复制前列出精确文件、对比双方差异；learn 有用户改动先保留并比较，禁止整目录覆盖。新增文件只能在目标不存在时复制。
4. learn 练习完成后按行为与边界 Review，不以写法相同为准。先让开发者修正问题；正确代码优先选入 dev，逐文件/代码段整合，不整体 merge learn。
5. 最终检查 dev 无教学 TODO，跑单元/必要集成与回归，写学习复盘和项目状态，获得开发者完成确认后才创建正式功能 Commit；不自动 Push 或合并 main。
6. 文档变化同样显式比较后同步。后续如需提交初始文档，优先独立文档提交与审查后的受控传播，不用覆盖当前副本或重置用户工作区。

## 未提交代码的本地保护

每次切换任务、生成教学版、同步或长时间保留未提交参考实现前运行：

```powershell
python G:/python_code/gellow-web/tools/snapshot-worktree.py G:/python_code/gellow-web-dev
python G:/python_code/gellow-web/tools/snapshot-worktree.py G:/python_code/gellow-web-learn
```

工具在共享 Git 目录的 gellow-recovery 下创建独立时间戳目录，记录 HEAD、分支、状态、暂存/未暂存二进制补丁、未跟踪列表，以及当前全部跟踪与非忽略未跟踪文件的 ZIP 和 SHA256 清单；不执行 Git 提交。默认不保存 ignored 文件（.env、本地草稿、node_modules 等）；必要私有文件需另做受控备份，不能误认为也在快照内。原目录已有 ignored 用户文件本轮均未触碰。

快照包含源码，可能包含非忽略的敏感文件，保存在本地 .git，不推送；不要复制到公开 assets。快照与仓库同磁盘，只防本地误操作，不代替离线备份。复制期间不要同时编辑；工具核验文件散列，并在源变化时失败，失败目录不能作完成快照。

恢复：先另建安全临时目录，核对 manifest.json 的 HEAD、status 与 SHA256，将 files.zip 解到临时目录后逐文件比较；删除项以 status 与补丁为依据人工审查。需要保留暂存边界时参考 staged.patch/unstaged.patch。不要直接在现有 learn 解压覆盖，不自动 reset/clean/apply。先备份当前状态，再选择性恢复。快照不是 Git 提交，恢复后还须重新测试。

## 部署边界

learn 没有远程分支，当前不可能由本次推送触发部署，因为未推送。尚未读取或更改 Vercel 平台生产分支/预览策略，因此平台级 learn 拦截未验证。以后任何连接 learn 的 CI、自动发布或手动生产发布均禁止；只有通过集成验收的 main 可用于正式生产发布，配置平台策略另按明确任务核验。

## Phase 0 保存授权

2026-11-04 用户明确要求先保存 Phase 0 文档，再开始 SEC-01。本次将初始化文档和恢复工具作独立本地基础提交，随后仅将该提交快进到 dev/learn；不包含业务功能，不 Push。上文未跟踪状态为初次初始化时的历史事实；保存后以各工作区 git log/status 为准。
