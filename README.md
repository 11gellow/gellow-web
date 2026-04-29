# gellow-web

Gellow 的个人网站仓库。

目前仓库里主要在维护三块内容：

- `gellow-homepage/`：Home 页面，现已改成物理交互式首页
- `gellow-blogpage/`：Blog 主站，内置 Pac-Man 悬浮窗和 `notes` 入口
- `gellow-notespage/`：早期独立 notes 页面，当前更多作为旧版本存档参考

现在的结构还不是最终 monorepo 形态，但已经可以继续在这个仓库里集中开发 `home / blog / notes`。

## 当前目录

- `gellow-homepage/frontend/`
  Home 页前端。当前版本是全屏 `canvas` 交互首页，包含几何图形、黑洞吸入、网页跳转和鼠标反馈效果。

- `gellow-homepage/backend/app.py`
  Flask 后端。负责：
  - 提供 `gellow-homepage/frontend/` 静态页面
  - 提供 Pac-Man 分数接口
  - 提供 blog / notes 文章与站点设置接口
  - 连接 Turso 数据库

- `gellow-blogpage/`
  Blog 前端主站。当前包含：
  - 博客首页
  - 文章详情页
  - 内置 Pac-Man 悬浮窗
  - `notes/` 控制台页面

- `gellow-notespage/`
  旧版 notes 独立页面，当前不是主线入口。

- `_local_archive/`
  本地备份内容。

- `physics_web/`
  旧分支/旧实验代码残留目录，当前不是主开发目标。

## 当前线上思路

目前项目还是分目录维护，不是单一应用：

- `gellow-homepage/`：偏 Flask + Vercel Python 路线
- `gellow-blogpage/`：偏静态前端页面路线

其中 `gellow-homepage/vercel.json` 当前会把请求交给 `backend/app.py`，由 Flask 统一返回首页和 API。

## 功能概览

### Home

- 电子命令行 / 点阵云风格
- 鼠标移动与点击反馈
- 二维几何图形物理碰撞
- 黑洞吸入与跳转逻辑
- 已接入的跳转节点：
  - GitHub
  - Steam
  - Bilibili
  - Blog
  - `rs.gellow.top`

### Blog

- 博客文章流首页
- 文章详情页
- 书签式外链入口
- 右上角 Pac-Man 按钮
- 双击 Pac-Man 输入密码后进入 `notes`

### Notes

- 文章增删改查控制台
- 展示内容设置
- 与 blog 数据结构对接

## API 概览

当前 Flask 后端主要提供这些接口：

- `GET /api/health`
- `GET /api/scores`
- `POST /api/scores`
- `GET /api/content/public`
- `GET /api/content/admin`
- `GET /api/content/posts/<slug>`
- `POST /api/content/posts`
- `DELETE /api/content/posts/<id>`
- `PUT /api/content/settings`

## 本地运行

### 运行 Flask 后端

在 `gellow-homepage/` 下：

```bash
pip install -r requirements.txt
pip install -r backend/requirements.txt
python backend/app.py
```

默认本地访问：

```text
http://127.0.0.1:5000
```

启动后 Flask 会：

- 提供 `gellow-homepage/frontend/` 首页
- 提供分数接口
- 提供文章与设置接口

## 环境变量

当前后端使用 Turso，必须配置：

```env
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-token
```

如果缺少这两个变量，`gellow-homepage/backend/app.py` 会直接启动失败。

## 开发建议

- 想改首页交互：优先看 `gellow-homepage/frontend/js/main.js`
- 想改首页视觉：优先看 `gellow-homepage/frontend/css/style.css`
- 想改博客前端：优先看 `gellow-blogpage/`
- 想改文章和站点设置接口：优先看 `gellow-homepage/backend/app.py`
- 想继续做真正的 monorepo 合并：下一步可以再统一 `home / blog / notes` 的部署入口和共享资源

## 备注

这个仓库最近做过较多结构调整，部分旧目录仍然保留，主要是为了方便回退、参考和迁移。后面如果确认新结构稳定，可以再统一清理历史目录。
