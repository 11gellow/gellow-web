# Phase 0 仓库审查

审查日期 2026-11-04；基线 6a3b09c0fd038cca6435b6f624ad3e25619651cc。依据实际源码和本地 Git，不以 README 代替事实。开始时 main 干净，仅一个 Worktree；既有分支全部保留。

## 内容与复用

VitePress srcDir=site，srcExclude 仅排除 local-editor.md 和 __local-draft.md，buildEnd 复制 assets。posts.data.ts 读取 Markdown，并按 collection 分类；目前 14 篇文章中八篇 collection: note（以本轮计数验证为准）。BlogPost 为旧 slug 到静态文章的跳转桥。Layout/BlogHome/MarkdownPost、欢迎页、导航、播放器、Arcade 和样式继续复用。
独立 note/main.ts 挂载 PostEditor，note:build 输出 note-dist；预览关闭原始 HTML，并用 DOMPurify、沙箱 iframe。它不是私有 Note。旧 gellow-notespage 保留，未见当前主题直接依赖；须确认域名/外部引用再退役。
content-api.ts 仍定义旧 CRUD 与上传客户端，但当前三个主要页面无该模块调用；迁移脚本依赖旧 admin API。arcade.js 仍调用 Flask scores，不能把整个后端当作已废弃。已有 SQL 参数化、序列化与输入校验可在测试后抽取；上传分类不等于内容安全检查。

## 当前 API（均从 app.py 装饰器核对；未执行公网请求）

| 方法与路径 | 当前用途 / 访问控制 |
| --- | --- |
| GET /api/health | 固定 ok，非数据库健康；导入仍要求 Turso |
| OPTIONS /api/<path> | 通配 CORS |
| GET /api/scores | 排行榜，limit 1～100 |
| POST /api/scores | 写积分，名称长度/非负积分校验，未鉴权/未限流 |
| GET /api/content/public | published 内容和全部 settings，公共缓存 |
| GET /api/content/admin | 所有状态正文与 settings，无鉴权 |
| GET /api/content/posts/<slug> | 仅 published，公共缓存 |
| POST /api/content/posts | 创建/更新文章，无鉴权 |
| DELETE /api/content/posts/<int:post_id> | 删除文章，无鉴权 |
| PUT /api/content/settings | 更新配置，无鉴权 |
| POST /api/attachments | multipart 文件完整读入内存后检查默认 100MB，无鉴权 |
| GET /api/attachments/<int:id>/<path:filename> | 按 id 读取 BLOB，无鉴权，可内联部分类型；非私有资源 |
| GET /、/<path:path> | 主页和静态资源，未找到回退 index.html |
| POST /api/blob-upload（Node） | handleUpload 发放上传令牌，无用户校验，CORS * |

## 数据库与依赖

旧 init_db 定义 scores、blog_posts、site_settings、attachments，空文章表自动种子，设置缺项自动补充；无版本化迁移。全部连接要求 TURSO_DATABASE_URL/TURSO_AUTH_TOKEN；with/commit 分散在路由，关闭和回滚语义需要驱动实测。时间使用 localtime，新系统拟统一 UTC，不无声转换旧数据。
backend/requirements.txt 有 Flask/libsql/python-dotenv；homepage 根 requirements.txt 只有 Flask，存在依赖发现不一致。Python 未锁定、无 pyproject/pytest。Blog 使用 npm lockfile，有独立脚本但无统一 test 命令。
本机 Python 3.13.5、Node 24.15.0、uv 0.11.0、SQLite 3.45.3。PyPI 元数据核查 libsql 0.1.11 存在 cp313 Windows amd64 与 Linux x86_64 wheel，只证明分发可用，不证明安装、远程事务或 Vercel 运行成功。来源：[PyPI](https://pypi.org/pypi/libsql/json)、[官方 SDK](https://github.com/tursodatabase/libsql-python)。

## 部署核查

homepage/vercel.json 使用 @vercel/python，全部路由交 app.py；Blog 使用 npm run build → dist；无同源 API 代理。note 独立静态配置输出 note-dist；旧部署文档描述 CLI 发布，未登录平台核验。未核验生产分支限制、环境变量、域名当前指向、依赖安装、云端缓存和在线接口可达性。learn 禁止部署是本地规则，远端平台级拦截尚未核验，不宣称已配置。

## 问题清单与处置计划

下列是源码证据，不表示已证实公网可利用；本轮未执行攻击请求、写生产库或修改业务代码。

| ID / 优先级 | 证据与影响 | 后续处置及验收 |
| --- | --- | --- |
| S-01 / 紧急 | app.py:394、428、548、556，admin 读与内容写无身份验证；存在草稿泄露/篡改/删除风险 | 在继续公网运行前优先隔离旧管理读写，再实现正式服务端认证授权；匿名读写拒绝，保留公开文章与积分契约；只收紧 CORS 不足以代替鉴权 |
| S-02 / 紧急 | app.py:481 与 api/blob-upload.js，匿名上传/发令牌；资源滥用与费用风险 | 公网运行前关闭或保护两条上传通路，设置请求层大小、类型与额度；匿名不能获得令牌/上传；未来私有附件独立鉴权与存储 |
| S-03 / 高 | 两份 js/feedback.js 从 hash/query/localStorage 取 title/message/variant，拼入 innerHTML（Blog 319/329，主页 264） | 改文本节点与 variant 白名单；无害 HTML 标记验证应作为文本显示；覆盖普通/pending/resolved 三种提示 |
| S-04 / 高 | migrate-posts-to-markdown.mjs 在校验/完整转换前删除 posts 下所有 .md；空/畸形响应也可能清空，admin 数据未过滤 published | 暂停运行；先做非破坏导出、备份、dry-run、状态过滤、文件名约束与冲突检查，临时目录校验后人工批准替换；原文件不丢失、草稿不发布 |
| S-05 / 高 | collection 分类不会阻止构建；公开附件和 assets 可直接访问 | 不把当前 NOTE 当私有；先用模拟内容设计鉴权，私有正文/附件不得进入 Git/dist/公共缓存 |
| S-06 / 中 | 导入即建表/种子，根依赖不完整，debug=True 仅直接运行时启用 | 工厂导入无远程写、显式迁移、隔离测试、明确生产启动；不直接启动旧后端作审查 |
| S-07 / 中 | 积分可伪造、无限流，上传先读内存，异常返回未统一 | 保留公开互动前提下限制输入/频率、请求大小；统一错误处理，不泄露内部信息 |
| Q-01 / 中 | test-note-output.mjs 硬编码三篇与现有八篇冲突 | 以内容来源和链接行为修订测试，不能通过删笔记迎合旧断言 |

安全处置的源码修改安排在后续独立小任务，本轮不执行；线上暴露面/隔离操作需专门核实，不能因 Phase 0 文档完成认为风险消失。

## 本轮验证与范围

- git status/branch/log/worktree、git ls-files 和定点源码审查已执行；业务文件无变更、历史不重写。
- test-shuffle、test-quote-shuffle、test-outline-levels 三脚本通过。
- npm run build 成功；现存三张图片路径解析警告和大 bundle 警告，尚未浏览器核验图片实际路径。
- test-note-output 在新构建后失败：条目数期望 3、实际 8，属于旧验收失配。
- 未导入/启动旧 app.py（避免导入即远程建表/写种子），未测试线上 DB、认证和部署；未运行迁移脚本。

## 阶段调整

保留 Phase 1～7 顺序，在 Phase 1 前加入公开危险接口隔离门槛；Phase 1 增加驱动兼容性和旧契约基线，Phase 6 保留模拟数据优先。第一任务 P1-01 只做最小工厂/配置/健康接口/pytest，教学 L1（1～2 个配置或纯函数练习），不同时写数据库与登录。安全 S-01/S-02 若仍公网可达，应先单独处置。
