# Gellow Web 开发入口

两份用户规范是长期依据，必须同时遵守：[总规划](docs/specs/DEVELOPMENT.md)、[学习与双分支规范](docs/specs/LEARNING_WORKFLOW.md)。它们是用户于 2026-11-04 提供的原文；新指令优先，冲突须记录，不静默改写历史。

- 恢复上下文先读 [STATUS](docs/STATUS.md)、[TASKS](docs/TASKS.md)，再核对 Git 状态与当前目录所属分支。
- 按需读 [PROJECT](docs/PROJECT.md)、[ARCHITECTURE](docs/ARCHITECTURE.md)、[DECISIONS](docs/DECISIONS.md)；实际业务任务设计前按学习规范阅读六份管理文档（含 [LEARNING](docs/LEARNING.md)）。
- Phase 0 已完成；用户于 2026-11-04 授权保存 Phase 0 文档并开始 SEC-01，遵守双分支教学流程。此授权不包含整个后端或部署。后续一次推进一个小任务。
- main 稳定；dev 完整参考实现；learn 教学。实际路径、同步、恢复和验收见 [WORKFLOW](docs/WORKFLOW.md)。不得在 main 开发业务，不整体合并 learn 到 dev。
- dev 参考答案在开发者尝试前不主动展示；learn 初期仅 1～3 个关联练习点，按 Hint 1～4 提示，不主动填完 TODO。正确且通过 Review 的开发者实现优先整合。
- 正式功能提交必须经过练习、Review、复盘、选择性整合、最终测试、文档同步和开发者完成确认。此前不创建最终功能 Commit。不得自动 Push、部署或合并 main。
- 不覆盖用户未提交内容；未提交代码不受 Git 提交保护，跨工作区复制前检查双方并创建可恢复快照。禁止强制 reset、clean 或覆盖式 checkout；不修改线上数据库。
- 不凭过时 README 删除代码。保留像素风、文章、播放器、小游戏；旧代码用途和调用方审查见 [PHASE0](docs/PHASE0_REVIEW.md)。
- 私有正文和附件不得进入公开 Git 或静态产物；公开 NOTE 分类并不等于私有。故意错误仅限隔离 learn，不植入认证或权限漏洞。
- 完成任务同步 TASKS、STATUS、必要的 LEARNING 和决策。未执行的验证明确写未执行；重要选型记录理由、替代方案、代价与确认依据。重大需求/架构改变未经授权先确认。
