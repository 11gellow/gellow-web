# 学习笔记

身份卡片菜单 NOTE 进入 `/note.html`。它复用 Blog 列表、阅读组件、加载动画和欢迎页展开动画。

笔记仍保存在 `site/posts/*.md`，在文件顶部增加 `collection: note` 即归入 NOTE，不再显示在 BLOG：

```yaml
---
pageKind: markdown-post
collection: note
title: "学习笔记标题"
description: "笔记简介"
date: "2026-09-09"
slug: "my-study-note"
outline: [2, 3]
---
```

未填写 collection 的文章默认属于 Blog。两边都按日期倒序排列。
本次迁移只调整分类，不移动文件、不修改正文和文章 URL，旧链接继续可用。
NOTE 是博客内的学习笔记页，与 `note.gellow.top` 文章格式生成器无关。
