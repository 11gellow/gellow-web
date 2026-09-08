# Gellow Blog

基于 VitePress + Vue 自定义主题的像素风静态博客。文章以仓库内 Markdown 文件为唯一内容来源，构建和部署不依赖内容数据库。

## 写文章

在 `site/posts/` 新建 Markdown 文件，并添加 frontmatter：

```md
---
pageKind: markdown-post
title: "文章标题"
description: "文章摘要"
date: "2026-09-08"
updated: "2026-09-08"
slug: "article-slug"
tags: [Vue, VitePress]
outline: [2, 3]
---

正文从这里开始。
```

完整语法参见 `docs/MARKDOWN_GUIDE.md`。首页会在构建时自动读取并按日期排序，不需要手工维护文章列表。

## 本地开发与构建

```bash
npm install
npm run dev
npm run build
npm run preview
```

构建结果位于 `dist/`。Vercel 仅部署静态页面及 Arcade 相关资源。

## 旧文章迁移

```bash
npm run migrate:posts
```

迁移脚本只读取旧内容 API，把文章 HTML 转换为 Markdown，并把 Base64 图片提取到 `assets/posts/`；不会修改或删除数据库。当前 7 篇旧文章已经完成迁移，清单记录在 `site/posts-migration.json`。

## 结构

```text
gellow-blogpage/
├─ .vitepress/
│  ├─ config.mts
│  └─ theme/
│     ├─ Layout.vue
│     ├─ components/
│     │  ├─ BlogHome.vue
│     │  ├─ MarkdownPost.vue
│     │  ├─ MermaidDiagram.vue
│     │  ├─ ArcadePage.vue
│     │  └─ PixelLoader.vue
│     ├─ components/PostEditor.vue  # 废案保留，不导入、不构建
│     └─ content-api.ts             # 旧编辑器配套废案
├─ site/
│  ├─ index.md
│  ├─ arcade.md
│  ├─ posts.data.ts
│  └─ posts/*.md
├─ scripts/migrate-posts-to-markdown.mjs
├─ css/
├─ assets/
└─ docs/MARKDOWN_GUIDE.md
```

旧 `/blogs/post.html?slug=...` 链接保留为兼容跳转入口。Notes、在线编辑器及双击密码入口不再生成或展示。
