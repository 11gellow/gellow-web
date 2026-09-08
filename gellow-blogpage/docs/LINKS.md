# 链接收藏页

页面地址：`/links.html`，身份卡片菜单的 LINKS 可进入。

编辑 `site/links.md` 的 YAML 区域：

```yaml
---
pageKind: links
title: Gellow Links
links:
  - title: "自定义标题"
    url: "https://example.com/"
---
```

复制一组 title / url 就能增加卡片，顺序即页面显示顺序。保留缩进，建议文字使用双引号；文字内双引号写成 \"。
简介直接显示 url，整张卡片可点击并在新标签页打开，原页面音乐不会被中断。
只允许完整 HTTP/HTTPS 地址；无效地址显示提示而不提供跳转。
修改后运行 `npm run build`，提交并 push 后由分支部署更新。
