# 长期技术决策

日期均为 2026-11-04。已确认只记录用户授权的基线；候选不构成实施授权。

## D-001｜保留网站、模块化单体与教学工作流

- 状态：已确认。
- 背景与问题：长期维护和学习不能被一次性重写替代。
- 最终选择：VitePress 静态公开博客 + Flask 模块化单体 + Jinja2 首版后台；main/dev/learn 与独立 Worktree，参考实现先保留未提交，教学验收后提交。
- 原因：复用现有功能，缩小每次任务，优先开发者理解与代码所有权。
- 替代方案：整体重写、微服务、直接将 AI 答案提交；用户规范明确不采用。
- 影响：按阶段迁移，不整体合并 learn，不自动推送部署；未提交代码需本地快照。
- 确认依据：本轮用户明确指定两份原始规范为长期依据，见 specs/。
- 新旧关系：无。
- 架构与事实：ARCHITECTURE、WORKFLOW；本轮创建两分支，旧历史原样保留。

## D-002｜保留既有 Turso，本地 SQLite；生产兼容性门槛

- 状态：已确认（现有系统保留与本地 SQLite 范围）；生产新系统驱动/迁移工具候选见 D-003。
- 背景与问题：旧库仅支持远程 Turso，导入即写库；Windows 学习和测试需要隔离、可重复环境。
- 最终选择：不迁移/替换现有生产 Turso；新工程本地与测试优先标准库 SQLite，数据访问隔离驱动差异；优先继续评估 Turso，验证通过后才接入新工程。
- 原因：满足用户保留和优先评估要求；本机 sqlite3 可用，官方 libSQL 声明 SQLite 兼容。已核查 PyPI libsql 0.1.11 有 CPython 3.13 Windows/Linux wheel。
- 替代方案：立即换 PostgreSQL 增加迁移成本；本地直连生产库可能有写入副作用；现在都不采用。
- 影响：不得把 SQLite 测试推定为 Turso 验收；生产接入前验证连接、关闭、回滚、并发、外键、RETURNING、迁移及 Vercel 打包。无线上建表授权。
- 确认依据：用户总规划技术栈和本轮保留代码/历史要求；本条不代表用户已批准未知生产驱动。
- 新旧关系：无。
- 相关证据：[官方 SDK](https://github.com/tursodatabase/libsql-python)、[Flask SQLite 教程](https://flask.palletsprojects.com/en/stable/tutorial/database/)、[PyPI 元数据](https://pypi.org/pypi/libsql/json)，核查日期同上。

## D-003｜待验证的依赖与部署集成

- 状态：待确认。
- 背景与问题：源码 requirements 不一致，尚无锁文件/迁移/隔离云端验收，当前跨域 API 不满足目标同源 Session 方案。
- 最终选择：未确认；候选 uv + pyproject.toml + 锁文件、pytest、libsql 精确版本及迁移方案；应用工厂、同源 /api 代理。
- 原因：用户要求先核查兼容性；[Flask 官方工厂模式](https://flask.palletsprojects.com/en/stable/patterns/appfactories/)支持隔离应用配置。
- 替代方案：保留 requirements 或其他成熟迁移工具；最终工具组合尚未比较，不凭 AI 偏好批准 ORM。
- 影响：P1-01 可做已授权目标内最小工厂方案；远程 DB、迁移和生产入口切换需隔离验证及后续授权，不在 Phase 0 实施。
- 确认依据：仅为 Phase 0 提案，生产实测和具体版本未确认。
- 新旧关系：补充 D-002，不替代。
- 相关架构：ARCHITECTURE；验收 P1-02/P1-03/P1-06。
