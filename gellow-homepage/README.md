# Gellow Homepage

个人主页前端加一个 Flask 后端，用来把吃豆人分数写入 Turso。

## 目录结构

- `frontend/`：页面结构、样式和前端脚本
- `backend/app.py`：Flask 应用与分数接口
- `backend/requirements.txt`：后端依赖

## 分数接口

- `GET /api/scores`：读取排行榜
- `POST /api/scores`：保存一条新分数

## 本地运行

1. 进入 `backend/`
2. 安装依赖：`pip install -r requirements.txt`
3. 启动服务：`python app.py`
4. 浏览器打开：`http://127.0.0.1:5000`

启动后 Flask 会同时提供前端静态页面和排行榜接口，分数直接写入 Turso 远程数据库。

## 切到 Turso

后端必须读取下面两个环境变量：

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

如果这两个变量缺失，后端会直接启动失败。

### Vercel 上要配的变量

在 Vercel Project Settings -> Environment Variables 里添加：

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

### 本地 `.env` 示例

```env
TURSO_DATABASE_URL=libsql://your-database-name-your-org.turso.io
TURSO_AUTH_TOKEN=your-token
```
