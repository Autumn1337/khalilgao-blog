# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Personal tech-writing blog, Astro 4 + MDX, self-hosted on a Hong Kong VPS. Static site; zero third-party JS. Site is <https://khalilgao.com>; repo owner is `Autumn1337`; author's on-site handle is "Khalil" (these are different identities — don't replace one with the other).

Authoritative reading order when something isn't obvious:

1. `khalilgao-blog-spec.md` — original product spec (design system, layout rules, perf budget)
2. `docs/USAGE.md` — author workflow (how posts get written, frontmatter schema, MDX component catalogue, AI-collaboration prompts, `needtosubmit/` drop-zone)
3. `DEPENDENCIES.md` — which deps are pinned and why (don't auto-bump these)

## Commands

| Task | Command |
|---|---|
| Dev server (HMR) | `npm run dev` — serves on `http://localhost:4321`, `--host` for LAN |
| Type + schema check | `npm run check` (= `astro check`). CI runs this before build |
| Production build | `npm run build` → `dist/` |
| Preview built dist | `npm run preview` |
| Regenerate content types | `npx astro sync` (rarely needed; build does it) |
| Resubset CJK fonts | `npm run subset-fonts` (= `python3 scripts/subset-noto-serif-sc.py`). Run after a new post introduces glyphs not in the existing subset. Requires Python + `fontTools` + `brotli`. |
| MDX math/brace probe | `node scripts/mdx-math-probe.mjs` — verifies which `{}` positions parse cleanly through remark-math + remark-pangu |

No test framework. "Verification" = `npm run check && npm run build && visually diff the rendered article`. The demo post at `src/content/posts/2026-04-22-minkowski-nfp-deep-dive/` exercises every component and is the de-facto visual regression fixture.

## Architecture — the bits you can't learn from one file

### Content pipeline (astro.config.mjs ↔ src/lib/shiki-transformers.mjs ↔ components/Mermaid.astro)

Markdown → HTML pipeline in `astro.config.mjs`:

- `remarkPlugins: [remarkMath, remarkPangu, remarkMermaid]`
- `rehypePlugins: [rehypeKatex]`
- `shikiConfig.transformers: [transformerCodeChrome()]`

The ordering matters, two non-obvious reasons:

1. **`remarkMermaid` is declared inline in `astro.config.mjs`** (not a separate package). It runs at the mdast level *before* Shiki ever sees ```` ```mermaid ```` fences, rewriting them into raw `<pre class="mermaid" data-graph="...">` HTML nodes. If you put mermaid-handling in rehype/after-shiki, Shiki highlights the mermaid source as a code block and the client-side renderer finds nothing.

2. **`transformerCodeChrome`** (in `src/lib/shiki-transformers.mjs`) is a Shiki transformer that:
   - parses fence meta like `cpp foo.cpp {1,3-5}` into `{ filename, highlights }`
   - writes `properties.class` (string, not `className` array — Shiki's line spans use the string form; writing `className` on top causes duplicate `class=` attrs in the output)
   - wraps the `<pre>` in a `<figure class="code-block">` with an injected copy-button `<button>` whose click handler is a single delegated listener in `BaseLayout.astro`.

   The 三 hooks used: `preprocess` (parses meta into `this.meta.__chrome`), `line` (applies `highlighted` class), `root` (wraps in figure + copy button).

### URL slugs (src/lib/post-url.ts + src/lib/tag-url.ts)

`post.slug` from Astro's content collection is the folder name (e.g. `2026-04-22-minkowski-nfp-deep-dive`). Public URLs strip the `YYYY-MM-DD-` prefix via `cleanSlug()`. Every caller that builds a post URL must go through `postUrl()` — do NOT use template literals like `` `/posts/${post.slug}/` ``.

Tags get a separate normalization in `tagUrl()` / `tagSlug()`: NFKC, lowercase, `c++` → `c-plus-plus`, `c#` → `c-sharp`, `&` → `and`, then non-letter/number → `-`. `tags/[tag].astro` throws if two different tag strings normalize to the same slug (collision guard).

### Post layout and the breakout grid (src/layouts/PostLayout.astro)

`.post-body` default is a **single-column flow** where children center themselves via `max-width: var(--w-prose); margin-inline: auto;`. On ≥1100px viewports **and only when `data-has-toc='true'` is NOT set**, `.post-body` becomes a 3-column named grid (full / wide / prose) so `WideFigure` / `.full-bleed` can break out.

Why the TOC gate: a TOC sidebar (200px) + gap (40px) + 960px wide column doesn't fit inside `.post-layout`'s `max-width: var(--w-wide) (960px)`. Attempting both collapses the prose column to ~0 and renders every character on its own line. If TOC is on, WideFigure degrades to prose width. To get 960px breakout, set `toc: false` in frontmatter.

### Design tokens (src/styles/tokens.css)

All colors / font stacks / sizes / spacing / radii are `var(--*)` rooted here. Dark theme only overrides values; structure stays the same. `@font-face` declarations are also here because fonts are conceptually part of the design system. **Never hard-code a color in a component** — add a token if the palette needs a new slot.

### Theme switching

FOUC-blocking: inline script in `BaseLayout.astro`'s `<head>` reads `localStorage.theme` and `matchMedia('(prefers-color-scheme: dark)')` and sets `document.documentElement.dataset.theme` **before paint**. `ThemeToggle.astro` flips that dataset + writes localStorage on click.

Shiki's dual-theme works because CSS in `code.css` switches via `:root[data-theme='light'] .astro-code span { color: var(--shiki-light) }` etc. The Shiki output contains both colors per span; the stylesheet picks which to show.

### Mermaid renderer (src/components/Mermaid.astro)

Included once in `PostLayout.astro`, not per-post. Ships zero server HTML; only a client script. Lazy-loads `mermaid` via dynamic import on the **first** `.mermaid` block's IntersectionObserver trigger (`rootMargin: 200px`). Re-renders all blocks when `document.documentElement.dataset.theme` mutates (MutationObserver).

### RSS full-content (src/pages/rss.xml.ts)

Uses `experimental_AstroContainer.create()` + `container.addServerRenderer({ name: mdxRenderer.name, renderer: mdxRenderer })` with `mdxRenderer = import('astro/jsx/server.js')` to render each post's `<Content />` into a string for `<content:encoded>`. Then `absolutizeHtmlUrls()` rewrites relative `src=` / `href=` to absolute so feed readers can follow images and links.

### Dates are UTC-rendered (src/lib/date-format.ts)

All `fmtISODate` / `fmtMonthDay` / `fmtYear` use `getUTC*` variants. CI runners are UTC, VPS is HKT; without this, a post published near midnight could show a different date in server-rendered HTML vs. local preview.

### pubDate tiebreaker — same-day posts need UTC ISO timestamps

Home / archive / RSS sort by `b.pubDate.valueOf() - a.pubDate.valueOf()` desc. Two posts with date-only `pubDate: 2026-04-24` produce equal millis, sort returns 0, and the final order falls through to `getCollection`'s read order — which is **directory-name alphabetical**. Two same-day posts almost always end up out of publication order this way.

Fix is per-post, not at the sort site: write `pubDate: 2026-04-24T13:15:00Z` for the second post, `2026-04-24T12:00:00Z` for the first. Always use UTC (`Z` suffix), not local offset (`+08:00`) — a local-offset timestamp can land on a different UTC date and the `getUTC*` formatters will show the wrong day.

### Font subset pipeline (fonts-source/ + scripts/subset-noto-serif-sc.py)

NotoSerifSC at the full U+4E00–9FFF block is ~1 MB per weight. The pipeline:

- `fonts-source/NotoSerifSC-{400,500}.woff2` — git-tracked source of truth (full CJK coverage). Sits **outside `public/`** so multi-MB sources don't ship to clients.
- `scripts/subset-noto-serif-sc.py` — scans `src/content/posts/**/*.mdx` for CJK chars, adds a punctuation safety buffer, then re-subsets via `fontTools.subset` keeping GPOS / GSUB so kerning still works. Outputs:
  - `public/fonts/NotoSerifSC-{400,500}.woff2` — client-served subset (currently ~180 KB each).
  - `fonts-source/NotoSerifSC-{400,500}-og.ttf` — TTF copies for the OG-image renderer (satori doesn't accept woff2). TTF is intentionally a superset that includes every post-title char.
- `npm run subset-fonts` triggers it. **Re-run when a new post introduces glyphs that aren't in the current subset** — the safety buffer covers most punctuation, so a single rare hanzi might still slip through. If a body looks like 豆腐块（squares），that's the symptom.

Spec target was 500 KB total for the CJK font; we're now at ~360 KB across two weights, comfortably under.

### OG image generation (src/pages/og/[...slug].png.ts)

Per-post `/og/<slug>.png` rendered at build time:

- `satori` walks a JSX-like object tree → SVG (yoga-wasm layout engine).
- `@resvg/resvg-js` rasterizes SVG → PNG.
- Fonts read from `fonts-source/NotoSerifSC-{400,500}-og.ttf` (read once, module-scoped).
- Layout: 1200×630 monochrome — small uppercase site label, large serif title, hairline rule, date + domain. Stays on-brand with the prose palette.

`PostLayout.astro` passes `ogImage={`/og/${cleanSlug(post)}.png`}` to `BaseLayout`. BaseLayout fans the URL out into eight share-card meta tags: `og:image` + `og:image:{width,height}`, `twitter:card="summary_large_image"` + `twitter:{title,description,image}`, plus `<meta itemprop="image">` and `<link rel="image_src">` for WeChat/legacy crawlers that don't follow Facebook's `og:*` namespace strictly.

### Structured data (JSON-LD in BaseLayout.astro)

Every page emits a `<script type="application/ld+json">` inline in `<head>`. `Article` schema on post pages (headline, description, dates, author, publisher, url, mainEntityOfPage, image=OG url, keywords=tags, inLanguage), `WebSite` schema everywhere else. Used by Google for rich results, by 百度 for 富摘要, and by Telegram / Discord preview services to supplement OG meta when ambiguous. Inlined via `is:inline set:html={JSON.stringify(...)}` so no Astro transform interferes with the JSON.

### TOC behavior — H2-always, H3 only for active section (src/components/TOC.astro)

A 10k-word post with 22 × h3 inside a 200px sidebar is a wall of text. Current shape:

- TOC.astro groups headings into a tree (h2 nodes carry an `h3[]` children array). Render uses nested `<ol>`: each h2 `<li>` contains its own `.toc__sub` list of h3s.
- CSS hides `.toc__sub` by default; only the `<li>` with `data-expanded='true'` reveals its children. Resting state is a clean h2-only outline.
- IntersectionObserver script tracks `expandedH2` alongside `activeId`. When the active heading is an h2 it expands itself; when it's an h3 it looks up `data-parent` and expands the owning h2 instead.
- Both desktop sidebar and mobile `<details>` instances share the script — `Map<slug, HTMLElement[]>` so the active class and expanded attribute set on every matching instance simultaneously.

If you ever revert to flat-list TOC, also revert the `data-parent` attribute and the `expandedH2` logic; otherwise CSS will hide everything.

### Scrollbar consistency (src/styles/global.css)

Two rules on `<html>` that aren't intuitive but visibly matter:

- `scrollbar-gutter: stable` — always reserves scrollbar space whether the page overflows or not. Without it, theme toggles or short pages cause a 15–17 px content-area jump as the scrollbar appears/disappears, which reads as a "page-margin mismatch between light and dark".
- `scrollbar-color: var(--border) transparent` + `scrollbar-width: thin` — page-level scrollbar matches the site palette. Without this, dark mode falls back to the OS default scrollbar, which is a bright stripe against the near-black bg. Code blocks and `.table-wrap` had this rule earlier; promoting it to `<html>` covers everything.

## MDX caveats (real ones we've hit)

- **Bare `{` in prose text fails** — MDX 3 tokenises it as a JSX expression. Safe positions: block/inline math (`$...$`, `$$...$$`), inline code, fenced code blocks (including mermaid's `B{决策}` rhombus), JSX props. Unsafe: prose. Escape with `\{`.
- **Images go through `<Figure>`** — not `![]()` and not `<img>`. Author imports the asset (`import fig from './assets/x.png'`) and passes as prop. Astro's sharp pipeline kicks in for ImageMetadata sources.
- **Do NOT use `@/` alias in `.astro` files** — tsconfig has the path mapping, but Vite resolver doesn't (we never added `vite.resolve.alias`). Stick to relative paths like `../../../components/Figure.astro`.

## Pinned deps / don't auto-bump

See `DEPENDENCIES.md`. Short version:

- `@astrojs/sitemap` pinned to `~3.2.1` — 3.7+ uses the Astro 5 `astro:routes:resolved` hook and crashes `_routes.reduce` on Astro 4.16.
- `remark-pangu` on 2.x (rewrite of 1.x series).
- Don't upgrade Astro to 5.x yet — several integrations ship 5-only releases that aren't back-compat.

## Platform quirks

- **WSL on `/mnt/e/` (NTFS)** — Vite's inotify watcher gets no events. `astro.config.mjs` sets `vite.server.watch.usePolling: true, interval: 300` so HMR works. If you see "edit saved, nothing updates", that's the trigger; don't remove this setting.
- **Astro dev toolbar disabled** — `devToolbar.enabled: false` in `astro.config.mjs`.

## Ignored paths worth knowing

- `docs/local/` — operator notes (VPS IP, RUNBOOK). Author can read it, never commit anything from there.
- `docs/handoff/` — session-state written by the handoff plugin, analogous to docs/local/. Don't commit.
- `needtosubmit/*` (README excepted) — draft drop-zone for `.md` → `.mdx` auto-publish flow. Drafts here get moved under `src/content/posts/` when published; the originals go to `needtosubmit/.archive/` (also gitignored).
- `.codex` — Codex plugin workspace marker.

Tracked-but-not-shipped: `fonts-source/` is committed (so subset-fonts is reproducible from a clean checkout) but lives outside `public/` so its multi-MB woff2 / TTF sources never end up in `dist/`.

## Deploy

CI: push to `main` → `.github/workflows/deploy.yml` → `npm ci` → `npm run check` → `npm run build` → `burnett01/rsync-deployments@7.0.1` rsyncs `dist/` to `/var/www/khalilgao.com/` on the VPS via the `deploy` user.

Secrets needed on the repo: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (full `-----BEGIN OPENSSH PRIVATE KEY-----...` block).

Nginx config lives at `deploy/nginx.conf`, pulled onto the VPS via `curl raw.githubusercontent.com/...`. `deploy/first-deploy-checklist.md` has the server-side bring-up steps. **HTTP/3 and Brotli are commented out** — Debian 12's `nginx-extras` is 1.22 (pre-QUIC) and has no `libnginx-mod-http-brotli` package; the comments explain re-enable paths.

## Commit style

Conventional commits with a long body. Every commit co-authored with Claude Opus. Big refactors get multi-paragraph rationale. Look at recent history for the exact tone.

## Spec compliance

`khalilgao-blog-spec.md` is the source of truth. If something in code disagrees with spec, deviations are recorded in commit messages. Before changing an intentional deviation, check git log for the reasoning commit. Examples of deviations and their resolutions / open status:

- NotoSerifSC font weight — spec target was 500 KB total. Initial release shipped ~2.1 MB across two weights; the `perf(fonts)` commit (subset-fonts pipeline) brought it to ~360 KB total, comfortably under spec.
- HTTP/3 + Brotli in nginx — spec wanted both. Disabled in `deploy/nginx.conf` because Debian 12's nginx-extras is 1.22 (pre-QUIC) and there's no brotli module in the main repo. Re-enable paths documented inline in the nginx config.
