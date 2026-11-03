# 架构与模块边界

## 当前实现（2026-11-04，main 6a3b09c）

| 位置 | 职责与依赖 |
| --- | --- |
| gellow-homepage/backend/app.py | 单文件 Flask，直接 libsql SQL、请求处理、建表种子、静态主页；导入时校验 Turso 凭据并执行 init_db |
| gellow-homepage/frontend | 静态主页 HTML/CSS/JS，含独立 feedback.js |
| gellow-blogpage/.vitepress | 自定义 Vue 主题，Layout 按 pageKind 分派，保留欢迎页、阅读页、音乐、小游戏 |
| gellow-blogpage/site | 静态 Markdown；posts.data.ts 构建期扫描 posts/*.md，collection 分 Blog/公开 NOTE |
| gellow-blogpage/note | 独立浏览器文章生成器，复用 PostEditor，localStorage、沙箱预览、下载 Markdown；非私有笔记服务 |
| gellow-blogpage/api/blob-upload.js | Vercel Node 上传令牌接口，现存内容 API 辅助代码可调用；未见身份校验 |
| gellow-notespage | 旧静态 Notes；保留待用途核查，不作为新系统基础 |
| physics_web、_local_archive | 本地目录；git ls-files 未包含 physics_web，archive 已忽略；不删除或迁移 |

当前流：Markdown → VitePress 构建 → dist → 公开阅读；Arcade → 跨域 warp.gellow.top/api/scores → Flask → Turso。content-api.ts 保留旧内容管理/上传客户端，但当前 BlogHome、BlogPost、PostEditor 不调用它；迁移脚本仍调用旧 admin API。

## 目标（来自已确认规划）

公开 VitePress 保持静态；动态账号、RBAC、管理、私有 Note 由 Flask 提供。浏览器优先同源 /api/；Jinja2 后台受服务端权限控制。生产代理/路由尚未配置，现有跨域地址不能直接视为 Session 可用方案。

目标后端 backend/app：应用工厂与配置；routes 接收 HTTP、services 执行业务、models/数据访问负责 SQL 与事务；模板独立，tests 使用隔离数据库，migrations 显式执行。依赖方向 routes → services → 数据访问；HTTP 对象不进入数据访问，避免单文件继续膨胀，不为简单逻辑创建无用抽象。

## 渐进迁移方案（Phase 1 执行，当前不移动文件）

先新增根 backend 的最小可测试工厂，不导入旧 app.py，不触发远程数据库；旧入口与部署维持。随后按健康检查、连接与事务、scores、主页兼容逐项迁移；每次迁移保留接口契约和回归检查。旧内容写接口先隔离，再按用途决定保留/退役。最后经验收切换 Vercel 入口，确认无调用方后才清理旧代码。

配置、连接、响应处理先做最小边界；Auth/RBAC/Note 随对应阶段加入，不提前创建完整空目录树。SQLAlchemy/Authlib/迁移工具等具体组合见 DECISIONS，未确认项不视为实施授权。

## 私有边界

collection: note 仅控制列表分类，正文仍静态输出；现有公开八篇保持公开属性，真实私有清单需内容所有者指定。未来私有存储不得位于 site 或复制 assets 的目录。私有正文、附件响应须逐请求鉴权并避免公共缓存；不能复用 apply_public_cache_headers。已公开内容不能通过删除当前文件撤销历史泄露，需单独处理历史与缓存，禁止擅自重写 Git 历史。

详细依据见 [审查](PHASE0_REVIEW.md)、[数据库初稿](DATABASE.md)。
