# Gellow Blog

像素风个人博客。公开首页、文章详情、Notes、编辑器、展示台和 Arcade 页面均已迁移到 VitePress + Vue 自定义主题。内容 API、附件上传和管理操作使用 TypeScript 模块，游戏循环作为独立引擎模块接入 Vue 页面。

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

构建结果位于 `dist/`。构建钩子只复制图片等公开资源；页面、样式和行为脚本均由 Vite/VitePress 打包。

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
│        ├─ NotesIndex.vue
│        ├─ PostEditor.vue
│        ├─ DisplayConsole.vue
│        ├─ ArcadePage.vue
│        └─ PixelLoader.vue
├─ site/
│  ├─ index.md
│  ├─ blogs/post.md
│  ├─ arcade.md
│  └─ notes/
│     ├─ index.md
│     ├─ editor.md
│     └─ display.md
├─ notes/css/             # Notes 视觉样式
├─ js/arcade.js           # 独立游戏引擎
├─ js/feedback.js         # 全局反馈/Toast 服务
├─ css/                   # 视觉样式的唯一来源
├─ assets/
└─ api/blob-upload.js
```

## 兼容约束

- 首页仍构建为 `/index.html`。
- 文章详情仍是 `/blogs/post.html?slug=...`。
- 原有 CSS class 保持不变，`css/style.css` 仍是视觉效果的权威来源。
- Notes、编辑器和展示台已经使用 Vue 响应式状态；不存在运行时旧 HTML 抽取。
- Arcade 的 DOM 由 Vue 管理，Canvas 游戏循环作为独立引擎保留，以避免把逐帧状态塞进 Vue 响应式系统。
- 新的全局播放器、文章目录或背景层应作为 `.vitepress/theme/components/` 中的独立组件加入，避免重新耦合到页面脚本。
