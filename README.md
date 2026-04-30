# gellow-web

- `gellow-homepage/`：交互式 Home 页面
- `gellow-blogpage/`：Blog 主站，包含文章页、Pac-Man、小型后台入口
- `gellow-notespage/`：较早期的 notes 版本，当前更多作为历史参考

---

## 项目结构

```text
gellow-web/
├─ gellow-homepage/
│  ├─ backend/
│  │  └─ app.py
│  ├─ frontend/
│  │  ├─ index.html
│  │  ├─ css/
│  │  └─ js/
│  ├─ requirements.txt
│  └─ vercel.json
├─ gellow-blogpage/
│  ├─ index.html
│  ├─ blogs/
│  │  ├─ post.html
│  │  └─ js/
│  ├─ notes/
│  │  ├─ index.html
│  │  ├─ editor.html
│  │  ├─ display.html
│  │  └─ js/
│  ├─ css/
│  ├─ js/
│  └─ assets/
├─ gellow-notespage/
├─ physics_web/
└─ README.md
```

---

## 技术栈

### 前端

- HTML
- CSS
- JavaScript
- Canvas 2D API
- DOM API
- Fetch API
- Drag and Drop API
- `contenteditable`
- FileReader API
- `localStorage`

### 后端

- Python
- Flask
- REST 风格接口
- JSON
- CORS

### 数据库

- Turso
- `libsql` Python 客户端
- SQLite 风格 SQL

### 部署与工程

- Vercel
- Git / GitHub
- 环境变量

---

## API

- `GET /api/health`
- `GET /api/scores`
- `POST /api/scores`
- `GET /api/content/public`
- `GET /api/content/admin`
- `GET /api/content/posts/<slug>`
- `POST /api/content/posts`
- `DELETE /api/content/posts/<id>`
- `PUT /api/content/settings`
