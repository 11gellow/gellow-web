# Gellow Blog

像素风个人博客。公开首页、文章详情、Notes 页面和 Arcade 路由已经迁移到 VitePress + Vue 自定义主题；编辑器、小游戏、附件上传和内容 API 的内部行为保持原实现。

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

构建结果位于 `dist/`。构建钩子会复制旧资源、样式和行为脚本；VitePress 负责生成首页、文章、Notes 与 Arcade 的 HTML 入口，因此现有附件预览、文章编辑和小游戏行为不会因展示层迁移而改变。

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
│        ├─ LegacyVitePressPage.vue
│        └─ PixelLoader.vue
├─ site/
│  ├─ index.md
│  ├─ blogs/post.md
│  ├─ arcade.md
│  └─ notes/
│     ├─ index.md
│     ├─ editor.md
│     └─ display.md
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
- Notes 和 Arcade 已由 VitePress 管理入口与生命周期，内部业务脚本暂时复用旧实现以保证行为一致。
- 新的全局播放器、文章目录或背景层应作为 `.vitepress/theme/components/` 中的独立组件加入，避免重新耦合到页面脚本。
