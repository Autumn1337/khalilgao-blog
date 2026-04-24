# Khalil's Notes — 个人博客项目规格

> 本文档是项目的唯一事实来源。实现时如遇规格未覆盖的问题，在 commit message 或 PR 描述里标注决策依据。

------

## 0. 项目概述

- **站点名**：Khalil's Notes
- **域名**：khalilgao.com
- **作者署名**：Hewen Gao（handle：Khalil）
- **语言**：中文为主，少量英文
- **内容类型**：长篇技术文章（AI 工具链、C/C++ 优化、算法竞赛、系统工程）
- **部署**：香港 Gomami VPS，Nginx 直连，不走 CDN

### 核心原则

1. 阅读舒适度高于一切其他审美/技术考量
2. 克制而温暖：外壳极简，正文传统书籍排版
3. 零广告、零第三方追踪
4. 所有资源自托管（字体、图片、统计）
5. 静态优先。性能即功能

------

## 1. 技术栈

| 项       | 选型                                        |
| -------- | ------------------------------------------- |
| 框架     | Astro 4.x                                   |
| 内容     | MDX                                         |
| 样式     | 原生 CSS（不用 Tailwind，保持语义化选择器） |
| 代码高亮 | Shiki（构建时 + 双主题）                    |
| 数学     | KaTeX + rehype-katex                        |
| 图表     | Mermaid（客户端渲染，CSS 变量注入主题）     |
| 图片放大 | medium-zoom                                 |
| RSS      | @astrojs/rss                                |
| Sitemap  | @astrojs/sitemap                            |
| 中英空格 | remark-pangu（构建时自动处理）              |
| 搜索     | v2 再加（Pagefind）                         |
| 评论     | v1 不做（v2 可选 Waline）                   |
| 统计     | v1 不做（v2 可选自部署 GoatCounter）        |

------

## 2. 目录结构

```
khalilgao-blog/
├── src/
│   ├── content/
│   │   ├── config.ts
│   │   └── posts/
│   │       └── 2026-04-22-minkowski-nfp-deep-dive/
│   │           ├── index.mdx
│   │           └── assets/
│   │               ├── fig1-mtv.svg
│   │               └── fig2-grid-layout.png
│   ├── components/
│   │   ├── SiteHeader.astro
│   │   ├── SiteFooter.astro
│   │   ├── PostCard.astro
│   │   ├── PostMeta.astro
│   │   ├── Tag.astro
│   │   ├── TOC.astro
│   │   ├── Figure.astro
│   │   ├── WideFigure.astro
│   │   ├── Mermaid.astro
│   │   └── ThemeToggle.astro
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── PostLayout.astro
│   ├── pages/
│   │   ├── index.astro              # 首页
│   │   ├── archive.astro            # 全部文章归档
│   │   ├── about.astro              # 关于
│   │   ├── 404.astro
│   │   ├── rss.xml.ts
│   │   ├── posts/
│   │   │   └── [...slug].astro
│   │   └── tags/
│   │       ├── index.astro          # 所有标签列表
│   │       └── [tag].astro          # 单个标签下的文章
│   ├── styles/
│   │   ├── global.css
│   │   ├── tokens.css               # 设计 token
│   │   ├── typography.css           # 正文排版
│   │   └── code.css                 # 代码块
│   └── lib/
│       ├── reading-time.ts
│       └── date-format.ts
├── public/
│   ├── fonts/                       # 自托管字体
│   ├── favicon.svg
│   └── robots.txt
├── astro.config.mjs
├── tsconfig.json
├── package.json
└── .github/workflows/deploy.yml
```

### 文章目录命名

```
YYYY-MM-DD-slug/index.mdx
```

- 目录而非单文件，是为了让文章的图片、数据文件随文章迁移
- URL 由 slug 决定：`/posts/minkowski-nfp-deep-dive/`（不包含日期）
- 日期在目录名里便于本地按时间浏览

------

## 3. 设计系统

### 3.1 颜色

#### 浅色主题（默认）

```css
--bg:           #fdfdfc;   /* 暖偏白，不用纯白 */
--text:         #1a1a1a;   /* 不用纯黑 */
--text-muted:   #6b6b6b;
--text-faint:   #9a9a9a;
--border:       #e5e2dc;
--border-faint: #efece6;
--code-bg:      #f5f3ef;   /* 比正文底色稍深的暖灰 */
--link:         #0066cc;
--link-hover:   #003d7a;
--selection:    #c8dcf0;
```

#### 深色主题

```css
--bg:           #1a1a1a;
--text:         #e8e6e3;
--text-muted:   #9a9894;
--text-faint:   #6a6866;
--border:       #2e2e2c;
--border-faint: #262624;
--code-bg:      #232321;
--link:         #66a8e0;
--link-hover:   #99c4ea;
--selection:    #2a4a6b;
```

#### 主题切换

- 默认跟随 `prefers-color-scheme`
- 顶部有手动切换按钮（Sun/Moon SVG 图标）
- 用户选择持久化到 `localStorage`
- **必须在 `<head>` 里放一段阻塞脚本读取 localStorage 并设置 `data-theme`，否则深色用户会看到浅色闪烁（FOUC）**

示例阻塞脚本：

```html
<script>
  (function() {
    var stored = localStorage.getItem('theme');
    var system = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = stored || system;
  })();
</script>
```

### 3.2 字体

#### 字体栈

```css
--font-serif:
  "Newsreader",
  "Noto Serif SC",
  "Source Han Serif SC",
  "Songti SC",
  "STSong",
  "SimSun",
  Georgia,
  serif;

--font-mono:
  "JetBrains Mono",
  "SF Mono",
  Menlo,
  Consolas,
  monospace;

--font-ui:
  -apple-system, BlinkMacSystemFont,
  "PingFang SC", "Segoe UI",
  sans-serif;
```

#### 字体文件（自托管）

放在 `public/fonts/`：

| 字体           | 字重                 | 用途                         |
| -------------- | -------------------- | ---------------------------- |
| Newsreader     | 400, 500, 400-italic | 英文正文                     |
| Noto Serif SC  | 400, 500             | 中文正文（需做字形子集裁剪） |
| JetBrains Mono | 400, 500             | 代码                         |

#### 加载策略

- 正文 400 字重用 `<link rel="preload" as="font" type="font/woff2" crossorigin>` 预加载
- 其他字重（italic、500、mono）延迟加载
- 所有 `@font-face` 必须 `font-display: swap`
- Noto Serif SC 全字重 ~15MB，**必须子集裁剪**：
  - 用 `fonttools` 的 pyftsubset 工具
  - 子集字符范围：GB2312 + 常用符号（约 6700 字）
  - 目标：单字重 500KB 以内

### 3.3 字号与行高

| 元素                    | 字号   | 行高    | 字重       | 字体                         |
| ----------------------- | ------ | ------- | ---------- | ---------------------------- |
| 正文                    | 17px   | 1.85    | 400        | serif                        |
| H1（文章标题）          | 30px   | 1.3     | 500        | serif                        |
| H2                      | 22px   | 1.4     | 500        | serif                        |
| H3                      | 17px   | 1.5     | 500        | serif（底部 0.5px 细下划线） |
| H4                      | 17px   | 1.5     | 500        | serif（无装饰）              |
| 首页文章标题            | 20px   | 1.35    | 500        | serif                        |
| 文章摘要                | 16px   | 1.75    | 400        | serif（muted 色）            |
| Meta（日期/阅读时长等） | 12px   | 1.5     | 400        | ui                           |
| Tag                     | 11px   | 1.5     | 400        | ui                           |
| 代码块                  | 13.5px | 1.7     | 400        | mono                         |
| 行内代码                | 0.88em | inherit | 400        | mono                         |
| 图注                    | 12px   | 1.5     | 400-italic | ui                           |

### 3.4 布局宽度

- **正文列**：`max-width: 680px`（约 36 中文字 / 72 英文字符）
- **Breakout 列**：`max-width: 960px`（用于较宽的图、表、代码块）
- **超宽**：`max-width: 1100px`（极少数大图/架构总览）
- **页面水平 padding**：桌面 `2rem`，移动端（≤640px）`1.25rem`

### 3.5 垂直间距

- 段间距：`1.25em`（不用首行缩进）
- H2 上下：`上 2.2em / 下 0.8em`
- H3 上下：`上 1.8em / 下 0.6em`
- 代码块上下外边距：`1.75em`
- Figure 上下外边距：`2em`
- 章节分隔（首页两篇文章之间）：`2.25em` + 底部 0.5px 细线

### 3.6 圆角

- 代码块：`5px`
- 图片：`4px`
- 标签：`3px`
- 按钮/输入：`4px`

### 3.7 过渡

- 主题切换：`background 200ms ease, color 200ms ease`
- 链接 hover：`color 120ms ease`
- 其他元素：**不加 transition**，避免整站"软塌塌"感

------

## 4. 页面清单

### 4.1 首页 `/`

布局：

- `<SiteHeader>` 顶部
- 站点介绍段落（约 60 中文字 / 150 英文字符），从 `src/content/config.ts` 读取或硬编码在 index.astro
- 分节标签"最近文章"（小型，UI 字体，11px，letter-spacing 0.8px，uppercase，底部 0.5px 细线）
- 最新 5 篇 `<PostCard>`
- "全部文章 →" 链接指向 `/archive/`
- `<SiteFooter>` 底部

`<PostCard>` 内容：

- 文章标题（20px / 500）
- Meta 行：`日期 · 阅读时长 · 标签列表`
- 摘要：取 `frontmatter.description`，如无则截取正文前 140 字

### 4.2 文章页 `/posts/<slug>/`

布局（桌面端 ≥1100px）：

```
┌──────────────── SiteHeader ────────────────┐
│                                             │
│          ┌─────TOC────┐  ┌── 正文 680px ──┐ │
│          │ Section 1  │  │  H1           │ │
│          │ Section 2  │  │  Meta         │ │
│          │  ...       │  │  ...          │ │
│          └────────────┘  │               │ │
│                          │  [WideFigure] │ │  ← 960px 宽，突破正文列
│                          │               │ │
│                          │  ...          │ │
│                          └───────────────┘ │
│          ┌──── Footer (prev/next) ─────┐   │
│          └─────────────────────────────┘   │
│                                             │
└─────────────── SiteFooter ─────────────────┘
```

- TOC 固定于视口左侧（`position: sticky; top: 6rem`），宽度 200px，距正文 40px
- TOC 仅展示 H2 和 H3（H3 缩进一级）
- 使用 IntersectionObserver 高亮当前阅读位置
- 屏幕 <1100px 时 TOC 隐藏
- `frontmatter.toc: false` 时强制不渲染 TOC

文章底部：

- 0.5px 分隔线
- 标签列表（`<Tag>` 小方块）
- 上一篇 / 下一篇链接（按发布日期前后，跨标签）
- 作者署名：`Hewen Gao · 2026-04-22`

### 4.3 归档页 `/archive/`

按年份倒序分组，每年内按日期倒序：

```
2026

  04-22   Minkowski 差与 NFP：CodeCraft 从 295K 到 904K 的关键跃迁
  04-18   Claude Code 内部机制：从 source map 还原的 1902 个 TS 文件

2025

  12-10   ...
```

- 年份 22px / 500 / serif
- 日期 12px / mono / muted
- 标题 17px / 400 / serif / 链接色
- 不展示摘要、不展示标签
- 极简哲学：便于快速扫描全部内容

### 4.4 标签页

`/tags/`：列出所有标签，按文章数量倒序：

```
c++ (12)    ai-tooling (8)    competition (6)    ...
```

- 标签之间 inline 排列，间距 12px
- 字号 14px / ui 字体

`/tags/<tag>/`：与归档页同款的极简列表，仅显示该标签下文章。

### 4.5 关于页 `/about/`

骨架由代码生成，**内容留 placeholder 由作者后续填写**。包含以下占位：

- 自我介绍（1 段）
- 兴趣 / 正在做的事（几个 bullet）
- 联系方式（邮箱、GitHub 链接）

### 4.6 404

简单的"找不到页面" + 返回首页链接 + 最近 3 篇文章。

### 4.7 RSS `/rss.xml`

**Full-content RSS**：正文 HTML 完整塞入 `<content:encoded>`，让订阅者在阅读器里直接读完，不用点回网站。

------

## 5. 内容模型

### 5.1 Frontmatter schema

`src/content/config.ts`:

```ts
import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.date(),
    updatedDate: z.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    toc: z.boolean().default(true),
    lang: z.enum(['zh', 'en']).default('zh'),
  }),
});

export const collections = { posts };
```

示例：

```yaml
---
title: Minkowski 差与 NFP：CodeCraft 从 295K 到 904K 的关键跃迁
description: 用 Minkowski 和的几何意义把 collision check 的天花板问题讲清楚。
pubDate: 2026-04-22
tags: [c++, competition, computational-geometry]
toc: true
---
```

### 5.2 标签规范

- 全小写
- 多词用连字符：`computational-geometry` 而非 `ComputationalGeometry`
- 优先英文（便于全球读者和 URL 友好）
- 单篇 3–5 个为宜，不超过 7

### 5.3 草稿机制

- `draft: true`：构建时完全跳过——不生成页面、不进 RSS、不进归档、不进标签列表
- `dev` 模式下可见（便于预览）
- 实现：在 content collection 的 `filter` 里判断 `import.meta.env.PROD`

### 5.4 图片管理

- 图片随文章放：`src/content/posts/<slug>/assets/<name>.<ext>`
- 在 MDX 里用相对路径：`<Figure src="./assets/fig1.png" alt="..." caption="图 1. ..." />`
- Astro Image 自动生成 AVIF + WebP + 原格式，`<picture>` 按需
- 自动懒加载（viewport 以下）
- SVG 小图标可直接 inline（支持 `currentColor` 跟随主题）

------

## 6. 组件清单

### 6.1 代码块

Shiki 双主题：

- 浅色：`github-light`
- 深色：`github-dark-dimmed`

```ts
// astro.config.mjs
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark-dimmed',
      },
    },
  },
  integrations: [mdx()],
});
```

代码块头部：

- 左：文件名（如 Markdown 语法提供了，如 ````cpp nfp.cpp`）
- 右：复制按钮（SVG 图标，hover 显示，点击反馈"已复制 ✓"）
- 不显示行号

行高亮：

- 支持 fenced 后缀语法 `{1,3-5}` 标注重点行
- 高亮行背景色稍深（`rgba(255,255,100,0.12)` 浅色 / `rgba(255,255,255,0.05)` 深色）

### 6.2 Figure 组件

`<Figure>` 正文宽：

```mdx
<Figure src="./assets/fig1.png" alt="图 1 描述" caption="图 1. 图注文字" />
```

`<WideFigure>` 突破正文列到 960px：

```mdx
<WideFigure src="./assets/fig2.png" alt="..." caption="..." />
```

两者共用行为：

- 居中
- 下方 figcaption（居中，斜体 12px UI 字体，muted 色）
- 4px 圆角
- 0.5px 浅边框（`var(--border)`）
- 点击放大（medium-zoom）
- 深色主题下给浅色截图加 8px 白色内 padding 包住（避免贴边消失）

### 6.3 Mermaid 图

MDX 里直接 fenced：

~~~mdx
```mermaid
graph LR
    A --> B
```
~~~

实现：

- 客户端动态 import（`import('mermaid')`），不影响首屏
- 初始化时从 CSS 变量读取主题色注入 mermaid config
- 主题切换时重新渲染所有 mermaid 块
- 加载延迟：第一个 mermaid 图出现在视口时才加载库

### 6.4 TOC

`<TOC headings={headings} />` 由 `PostLayout.astro` 传入 Astro 的 `getHeadings()`。

- 仅渲染 H2 / H3（depth 2 和 3）
- H3 缩进一级显示
- 样式：极简，无项目符号，12px UI 字体，muted 色
- 当前节高亮：IntersectionObserver 监听所有 heading，距顶部最近的标为 active
- active 态：`--text` 色 + 左侧 2px 实线
- 平滑滚动：点击跳转时 `scroll-behavior: smooth`
- `frontmatter.toc !== false` 且屏幕 ≥1100px 才显示

### 6.5 脚注

使用 remark-footnotes（Markdown 原生 `[^1]` 语法）：

```md
这是一个需要说明的点[^1]。

[^1]: 这里是脚注内容。
```

渲染：

- 正文中 `[^1]` 变成可点击的上标
- **悬停**（桌面）或**点击**（移动）弹出浮层显示脚注内容，不跳转
- 浮层样式：白底（深色主题下是暗色卡片）、0.5px 边框、4px 圆角、最大宽度 360px、padding 12px
- 页底仍生成完整脚注列表（无 JS / 打印时可读）

### 6.6 引用块

原生 `<blockquote>`：

```css
blockquote {
  margin: 1.75em 0;
  padding: 0.25em 1.2em;
  border-left: 2px solid var(--border);
  color: var(--text-muted);
  font-style: italic;
}
```

### 6.7 其他组件

- `<Tag tag="c++" />`：标签小方块
- `<PostMeta post={...} />`：文章元信息行
- `<ThemeToggle />`：主题切换按钮（Sun/Moon SVG 图标）
- `<ReadingTime minutes={18} />`：阅读时长（`X min read`）

------

## 7. Markdown / MDX 约定

- 文件扩展名统一 `.mdx`（即使不用 JSX 也行）
- H1 由 `frontmatter.title` 自动渲染，正文从 H2 开始
- 图片用 `<Figure>` 或 `<WideFigure>`，**不用裸 `<img>` 或 Markdown `![]()`**
- 外部链接自动加 `target="_blank" rel="noopener"`（remark plugin 处理）
- 中英文混排间距自动插入：用 remark-pangu 在构建时处理
- 数学：行内 `$...$`，块级 `$$...$$`，由 remark-math + rehype-katex 渲染

------

## 8. 部署方案

### 8.1 服务器基础

- 系统：Ubuntu 22.04 LTS（或更新）
- 用户：`deploy`（专用账户，具 sudo）
- 站点根：`/var/www/khalilgao.com`
- 域名：`khalilgao.com` + `www.khalilgao.com`（后者 301 到前者）

### 8.2 Nginx 配置

`/etc/nginx/sites-available/khalilgao.com`：

```nginx
# HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name khalilgao.com www.khalilgao.com;
    return 301 https://khalilgao.com$request_uri;
}

# www → apex
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    listen 443 quic reuseport;
    listen [::]:443 quic reuseport;
    server_name www.khalilgao.com;

    ssl_certificate     /etc/letsencrypt/live/khalilgao.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/khalilgao.com/privkey.pem;

    return 301 https://khalilgao.com$request_uri;
}

# Main site
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    listen 443 quic;
    listen [::]:443 quic;
    server_name khalilgao.com;

    ssl_certificate     /etc/letsencrypt/live/khalilgao.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/khalilgao.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    # Advertise HTTP/3
    add_header Alt-Svc 'h3=":443"; ma=86400';

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "DENY" always;

    root /var/www/khalilgao.com;
    index index.html;

    # Compression
    brotli on;
    brotli_comp_level 6;
    brotli_types text/html text/css application/javascript application/json
                 image/svg+xml application/rss+xml application/atom+xml
                 font/woff2 application/xml;

    gzip on;
    gzip_comp_level 6;
    gzip_types text/html text/css application/javascript application/json
               image/svg+xml application/rss+xml application/xml;

    # Long-cache for immutable assets
    location ~* \.(js|css|woff2|png|jpg|jpeg|webp|avif|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # HTML: no cache (enables fast rollouts)
    location / {
        try_files $uri $uri/ $uri.html /404.html;
        add_header Cache-Control "public, max-age=0, must-revalidate";
    }

    # Block hidden files and common scan patterns
    location ~ /\. { deny all; }
    location ~ /(wp-|\.env|\.git) { return 444; }

    # v2: Waline API reserved location (currently disabled)
    # location /api/waline/ {
    #     proxy_pass http://127.0.0.1:8360/;
    #     proxy_set_header Host $host;
    #     proxy_set_header X-Real-IP $remote_addr;
    # }

    error_page 404 /404.html;
}

# Rate limiting (global scope)
limit_req_zone $binary_remote_addr zone=blog:10m rate=30r/s;
```

在 `server {}` 块内加 `limit_req zone=blog burst=60 nodelay;`

### 8.3 TLS 证书（Let's Encrypt）

安装 certbot：

```bash
sudo apt install certbot python3-certbot-nginx nginx-extras
```

签发：

```bash
sudo certbot --nginx -d khalilgao.com -d www.khalilgao.com
```

自动续签由 certbot 的 systemd timer 接管，无需手动。

### 8.4 Brotli 模块

Nginx 默认不含 brotli，使用 `nginx-extras` 包：

```bash
sudo apt install nginx-extras
```

### 8.5 GitHub Actions 流水线

`.github/workflows/deploy.yml`:

```yaml
name: Build and Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy via rsync
        uses: burnett01/rsync-deployments@7.0.1
        with:
          switches: -avzr --delete --exclude='.git/' --exclude='.DS_Store'
          path: dist/
          remote_path: /var/www/khalilgao.com/
          remote_host: ${{ secrets.DEPLOY_HOST }}
          remote_user: ${{ secrets.DEPLOY_USER }}
          remote_key: ${{ secrets.DEPLOY_SSH_KEY }}
```

需要配置的 GitHub Secrets：

| Secret           | 说明                                                         |
| ---------------- | ------------------------------------------------------------ |
| `DEPLOY_HOST`    | 服务器 IP 或域名                                             |
| `DEPLOY_USER`    | `deploy`                                                     |
| `DEPLOY_SSH_KEY` | SSH 私钥（对应公钥已添加到服务器 `~deploy/.ssh/authorized_keys`） |

### 8.6 首次上线检查清单

- [ ] 域名 DNS A / AAAA 记录指向服务器 IP
- [ ] 服务器防火墙放行 80/443 TCP + 443 UDP（HTTP/3）
- [ ] `deploy` 用户创建，SSH key 配置完毕
- [ ] `/var/www/khalilgao.com` 目录创建，属主 `deploy:deploy`
- [ ] Nginx 配置 `nginx -t` 通过
- [ ] Certbot 签发证书
- [ ] GitHub secrets 配置
- [ ] 第一次推送到 main 分支，验证部署成功
- [ ] SSL Labs 评分 A+（https://www.ssllabs.com/ssltest/）
- [ ] HTTP/3 验证（https://http3check.net/）
- [ ] Lighthouse 跑一遍，核对性能预算

------

## 9. 性能预算

### 目标

| 指标                   | 目标   | 测试场景          |
| ---------------------- | ------ | ----------------- |
| LCP                    | < 1.5s | 国内直连，模拟 4G |
| FCP                    | < 0.8s | 同上              |
| CLS                    | < 0.05 | 任意页面          |
| TTI                    | < 2.0s | 同上              |
| Lighthouse Performance | ≥ 95   | 桌面              |

### 资源预算

| 资源                         | 预算                                    |
| ---------------------------- | --------------------------------------- |
| 首页 HTML（Brotli 压缩后）   | < 20 KB                                 |
| 首屏 CSS                     | < 15 KB                                 |
| 首屏 JS                      | < 10 KB（不含字体）                     |
| 首屏字体（单字重 Brotli 后） | < 80 KB（中文） / < 30 KB（英文 Latin） |
| 每张文章内图片               | < 200 KB（WebP / AVIF）                 |

### 实现策略

- Astro 默认零 JS。交互组件（主题切换、代码复制、TOC、medium-zoom、mermaid）用 `client:idle` 或 `client:visible`
- 字体 preload 仅正文 400 那一款
- 图片全部用 Astro Image 自动优化
- 不加载任何第三方脚本（不用 GA、不用 Disqus、不用任何追踪）

------

## 10. 可访问性基线

- 正文对比度 ≥ 7:1（AAA）
- 次级文字对比度 ≥ 4.5:1（AA）
- 所有交互元素键盘可达，`:focus-visible` 样式清晰（2px outline）
- 图片必有 `alt`
- 语义 HTML：`<header>` / `<nav>` / `<main>` / `<article>` / `<aside>` / `<footer>` 正确使用
- `prefers-reduced-motion: reduce` 下禁用所有过渡动画
- 跳转链接（Skip to content）可选

------

## 11. 开发流程

### 11.1 项目初始化

```bash
npm create astro@latest khalilgao-blog -- --template minimal --typescript strict
cd khalilgao-blog

npm install @astrojs/mdx @astrojs/rss @astrojs/sitemap
npm install rehype-katex remark-math remark-pangu remark-footnotes
npm install shiki medium-zoom mermaid
```

### 11.2 本地开发

```bash
npm run dev       # 启动 localhost:4321
npm run build     # 生产构建到 dist/
npm run preview   # 预览构建产物
```

### 11.3 发文工作流

1. `src/content/posts/` 下新建 `YYYY-MM-DD-slug/index.mdx`
2. 填好 frontmatter
3. 写作
4. `npm run dev` 本地预览
5. `git add . && git commit -m "post: slug" && git push`
6. GitHub Actions 自动构建并部署

### 11.4 草稿

- `draft: true`：本地 dev 可见，生产构建跳过
- 完成后改为 `draft: false`

------

## 12. v2 路线图（当前不做）

| 项           | 实现要点                                                     |
| ------------ | ------------------------------------------------------------ |
| **全文搜索** | Pagefind，构建时生成索引，站点右上角加搜索框                 |
| **评论**     | Waline 自部署，SQLite 后端，匿名评论开启，邮箱可选。Nginx 反代 `/api/waline/` 已预留 |
| **统计**     | GoatCounter 自部署，隐私友好                                 |
| **深度链接** | Heading 自动锚点 + 悬停显示 `#` 图标                         |
| **相关文章** | 基于标签 Jaccard 相似度                                      |
| **英文版**   | 若读者里英文读者多，考虑加 `lang: en` 分流                   |

------

