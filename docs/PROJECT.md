# 项目目标与范围

确认依据：2026-11-04 用户要求将[开发总规划](specs/DEVELOPMENT.md)与[学习规范](specs/LEARNING_WORKFLOW.md)作为长期依据。

首要目标是提升开发者独立编写、调试、理解和维护 Flask 后端的能力；功能速度次之。长期维护个人网站，保留公开博客与已有交互。

## 已确认范围

- 公开 Blog：继续 VitePress + Vue 3 + Markdown，保持像素风、链接、文章旧 URL、音乐和小游戏。
- Flask 模块化单体：用户名/邮箱/密码注册、本地登录退出与当前用户、用户资料、禁用恢复；成熟哈希和认证库。
- RBAC：guest（未登录身份）、user、note_reader、admin；权限 note:read、user:read、user:manage、role:assign，服务端判断。
- 第一版管理后台 Flask + Jinja2；GitHub OAuth、Google OIDC、安全身份绑定，不仅凭同邮箱自动合并。
- 私有 Note：后端鉴权正文与附件；先模拟数据，再迁移真实内容；私有内容不入公开仓库、构建与公共缓存。
- Phase 0～7 需求完整清单保留在原规范，进度只以 TASKS/STATUS 为准。

## 稳定约束

不推倒重写，不自动删除历史代码，不自动 Push/部署/合并 main，不改生产数据库。一次一个任务，必要测试与 Review 不省略。优先兼容 Vercel；数据库优先评估 Turso/libSQL，本地 SQLite；pytest、uv + pyproject.toml 等具体版本和集成需验证。
不引入微服务、Redis、Celery、消息队列或 Kubernetes。目录目标不是要求现在创建全部模块。

## 本轮边界与事实

本轮仅 Phase 0 + 双分支准备，未授权实现账号系统。当前无本地认证/RBAC；公开 NOTE 已有八篇静态笔记，不能标记为受保护。数据库具体选型结论及验证门槛见 DECISIONS，线上现状尚未验证。
