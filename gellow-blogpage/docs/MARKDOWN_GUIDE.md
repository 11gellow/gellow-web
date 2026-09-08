# Markdown 写作指南

本博客支持 VitePress 原生 Markdown，并补充了脚注、任务列表、数学公式和 Mermaid 图表。

## 常用语法

```md
## 二级标题

普通段落，**粗体**、*斜体*、~~删除线~~、[链接](https://example.com)。

> 引用内容

- 无序列表
1. 有序列表
- [x] 已完成任务
- [ ] 待办任务

| 名称 | 说明 |
| --- | --- |
| VitePress | 静态博客框架 |

脚注引用[^note]

[^note]: 脚注内容。
```

## 代码高亮

````md
```ts {2}
const name = "Gellow";
console.log(name);
```
````

支持语言高亮、行号、指定行高亮、`[!code focus]`、`[!code ++]` 和 `[!code --]`。

## 代码组

````md
::: code-group

```js [npm]
npm run dev
```

```sh [pnpm]
pnpm dev
```

:::
````

## 提示容器

```md
::: tip 提示
这是一条提示。
:::

::: warning 注意
这是一条警告。
:::

::: danger 危险
这是一条危险提示。
:::

::: details 点击展开
折叠内容。
:::
```

## 数学公式

```md
行内公式：$E = mc^2$

$$
\int_a^b f(x)\,dx
$$
```

## Mermaid 图表

````md
```mermaid
flowchart LR
  Markdown --> VitePress
  VitePress --> StaticSite[静态网站]
```
````

Mermaid 运行时按需加载，不会拖慢不含图表的普通页面。

## 图片与文件

推荐把图片放进 `assets/posts/`，从文章目录使用相对路径：

```md
![图片说明](../../assets/posts/example.webp)
```

普通附件可以使用链接：

```md
[下载附件](../../assets/posts/example.pdf)
```
