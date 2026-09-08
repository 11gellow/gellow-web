# 本地文章生成器

在 gellow-blogpage 目录运行 `npm run dev`，打开终端显示地址下的 `/local-editor.html`（默认 http://localhost:5173/local-editor.html）。仅在本机使用，不要将开发服务暴露到公网。

1. 填写 title、description、date、slug；slug 使用小写英文、数字和连字符。
2. 编辑 Markdown 正文。工具栏可插入二级/三级标题、代码块、代码组、表格、任务列表、提示框、折叠块、公式、Mermaid 流程图等示例。
3. 点击“更新主题预览”。右侧使用真实的 VitePress 文章页面，支持全屏预览与手机宽度。正文修改后需要再次更新预览；浏览器会自动保留表单草稿。
4. 点击“下载 .md”，将下载的 `日期-slug.md` 放到 `site/posts/`。检查同名文件和 slug，避免覆盖已有文章，再构建检查并通过 Git 发布。

图片先放入 `assets/posts/`，在正文使用 `../../assets/posts/文件名.png`。复制、导出会自动生成安全引用的 YAML 信息块和 `outline: [2, 3]`，无需手写 frontmatter。

预览仅写入固定临时文件 `site/posts/__local-draft.md`，该文件被 Git 忽略、排除出文章列表和生产构建。生成器路由和组件也不进入生产构建。旧数据库读写、删除、上传和隐藏入口已移除，不会自动发布文章。

此工具编辑的是 Markdown 源码并提供真实主题预览，不是 Word 式富文本编辑器。预览允许博客支持的 Markdown/Vue 内容，仅预览自己信任的内容。浏览器草稿并非永久备份，请及时下载；暂不提供导入现有完整 Markdown 的按钮，可将正文粘贴到编辑区。
