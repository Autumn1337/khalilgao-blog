# needtosubmit/ — 草稿发布暂存区

这是 Autumn 的草稿落脚区。任何想发布的 `.md` 文件丢进来，AI 会把它转成
MDX、按 blog 约定补 frontmatter、放进 `src/content/posts/` 并 push 上线。

**本目录 gitignored**，里面的草稿不会进仓库历史，不会被公开。

---

## 放法

### 单文件

```
needtosubmit/
└── shiki-dual-theme.md        ← 一个 .md，完事
```

### 带图片

```
needtosubmit/
├── shiki-dual-theme.md
└── shiki-dual-theme/           ← 和 .md 同名的子目录
    ├── fig1-flow.svg
    └── fig2-result.png
```

或者简单点：

```
needtosubmit/
├── shiki-dual-theme.md
├── shiki-dual-theme.fig1.svg   ← 文件名加前缀
└── shiki-dual-theme.fig2.png
```

AI 会自动找同名前缀 / 子目录的图。

---

## `.md` 最小形式

```markdown
---
title: 文章标题
pubDate: 2026-05-10
tags: [c++, algorithms]
description: 一句话摘要
---

正文从这里写。可以用纯 Markdown 语法（## 标题、**粗体**、列表、
表格、反引号代码块等）。

![图 1 说明](./shiki-dual-theme/fig1-flow.svg)

```cpp file.cpp
// 代码块照常写，可选带文件名
```

\{ 裸 { 会挂 MDX，或者先不用 `{`，AI 会在转换时处理 \}
```

**必填**：`title` + `pubDate`
**推荐**：`tags` + `description`
**其他**：AI 按需补（`draft` / `toc` / `lang`）

**一天发多篇**：`pubDate` 要精确到时间，用 UTC ISO 格式，否则
sort 同值，顺序会按目录字母序出，不是发表先后。例：

```
pubDate: 2026-05-10T12:00:00Z   ← 先发这篇
pubDate: 2026-05-10T13:15:00Z   ← 后发这篇（会排在上面）
```

---

## 触发发布

写完后在 Claude 对话里一句话：

```
发 needtosubmit/shiki-dual-theme.md
```

或者：

```
把 needtosubmit 里所有 md 都发掉
```

AI 会做的事（按顺序）：

1. 读 `.md`，验证 frontmatter 合法
2. slug 从文件名派生（`shiki-dual-theme.md` → `shiki-dual-theme`）
3. 建 `src/content/posts/YYYY-MM-DD-slug/`
4. 正文处理：
   - `![alt](path)` 图片语法 → `<Figure src={...} />` + MDX import
   - 把同名子目录 / 同名前缀文件挪到 `assets/`
   - 正文裸 `{` 自动 `\{` 转义
   - 代码块 fence 保留（filename、高亮行不变）
5. 写成 `index.mdx`
6. 本地 `npm run build` 验证，红了就停，把 log 给你看
7. 绿了 `git add + commit + push` → GitHub Actions 自动部署
8. 清理：原 `.md` + 图片从 `needtosubmit/` 挪到 `needtosubmit/.archive/` 留档（也 gitignored）

---

## 想先预览再发

```
发 needtosubmit/shiki-dual-theme.md，先 dev 预览不要 push
```

AI 会转换好、启动 `npm run dev`、给你 URL 让你在浏览器看。满意了说一句"推"，再 commit push。

---

## 想改已发过的文章

直接改 `src/content/posts/<dir>/index.mdx` 然后 push 就好，不走 `needtosubmit/`。或者问 AI："帮我把 `minkowski-nfp-deep-dive` 的第 3 节改成 ..."

---

## 注意

- **图片文件别太大**：> 500KB 的截图先在本地压一下（Figma export / TinyPNG / cwebp）
- **别放敏感信息**：frontmatter 或正文里不要写 API key、个人邮箱之外的 secret
- **tags 要用英文 + 连字符**：`computational-geometry` 而不是 `ComputationalGeometry` 或 `计算几何`
