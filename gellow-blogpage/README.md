# Gellow Blog

像素风个人博客。公开首页和文章详情已经迁移到 VitePress + Vue 自定义主题，原有 Notes、Pac-Man、附件上传和内容 API 保持原实现与原 URL。

## 本地开发

```bash
npm install
npm run dev
```

公开文章数据仍从 `content-api.ts` 配置的 API 读取；如果以 `localhost` 或 `127.0.0.1` 打开页面，需要同时启动 `gellow-homepage/backend/app.py`（默认端口 `5000`）。

## 生产构建

```bash
npm run build
npm run preview
```

构建结果位于 `dist/`。构建钩子会把 `assets/`、`css/`、`js/`、`notes/` 和 `arcade.html` 原样复制进去，因此现有 Notes、附件预览、文章编辑和小游戏逻辑不会因展示层迁移而改变。

## 结构

```text
gellow-blogpage/
├─ .vitepress/
│  ├─ config.mts
│  └─ theme/
│     ├─ Layout.vue
│     ├─ content-api.ts
│     └─ components/
│        ├─ BlogHome.vue
│        ├─ BlogPost.vue
│        └─ PixelLoader.vue
├─ site/
│  ├─ index.md
│  └─ blogs/post.md
├─ notes/                 # 保留的管理端
├─ js/                    # 保留的旧页面脚本
├─ css/                   # 视觉样式的唯一来源
├─ assets/
├─ arcade.html
└─ api/blob-upload.js
```

## 兼容约束

- 首页仍构建为 `/index.html`。
- 文章详情仍是 `/blogs/post.html?slug=...`。
- 原有 CSS class 保持不变，`css/style.css` 仍是视觉效果的权威来源。
- Notes 和 Arcade 暂不迁入 Vue；后续只有在对应功能单独重构时才移动。
- 新的全局播放器、文章目录或背景层应作为 `.vitepress/theme/components/` 中的独立组件加入，避免重新耦合到页面脚本。
