# 在线文章生成器

独立 Vercel 项目：`gellow-note`；域名：`note.gellow.top`。与 `personal-blog` 分开部署，不改博客生产域名。

在线站点是纯静态 Vue 应用，复用 PostEditor 和博客 CSS。草稿使用当前浏览器 localStorage；预览与 Markdown 导出全部在浏览器中完成，无服务器保存、无数据库连接、无在线发布接口。换浏览器/设备/域名不会自动同步草稿，清除浏览器数据会丢失草稿，请下载备份。

在线预览使用 markdown-it、Shiki、KaTeX MathML 和 Mermaid。普通 Markdown、标题、代码高亮、行号与指定行高亮、代码组、提示容器、折叠、任务列表、脚注、公式和流程图可预览；复用博客主题样式，但不执行原始 HTML、Vue 自定义组件和 VitePress 特有构建指令。高级 VitePress 指令仍须在博客本地构建中确认。新图片需要已有 HTTPS 链接；相对路径指向已发布博客，不上传本地图片。

## 开发

在 gellow-blogpage 目录运行 `npm run note:dev`。

## 构建与部署

本次为 CLI 静态产物部署，不会随博客 main 分支自动更新。

```powershell
npm run note:build
vercel link --cwd note-dist --project gellow-note --scope 2535358045qq-5117s-projects --yes
vercel deploy --cwd note-dist --scope 2535358045qq-5117s-projects --prod --yes
```

只上传 note-dist 静态产物，不上传本地草稿、原始音乐目录、数据库代码或环境文件。每次构建会重新生成产物，部署前重新 link。

## DNS

Cloudflare：CNAME，名称 `note`，目标 `7f35760c9cc230df.vercel-dns-017.com`，仅 DNS（关闭代理）。这是创建项目时 Vercel 实际返回的推荐值。更新后执行 `vercel domains verify note.gellow.top --scope 2535358045qq-5117s-projects` 检查。
