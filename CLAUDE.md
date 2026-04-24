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
- `needtosubmit/*` (README excepted) — draft drop-zone for `.md` → `.mdx` auto-publish flow. Drafts here get moved under `src/content/posts/` when published.
- `.codex` — Codex plugin workspace marker.
- `public/fonts/raw/` — intermediate font build artifacts.

## Deploy

CI: push to `main` → `.github/workflows/deploy.yml` → `npm ci` → `npm run check` → `npm run build` → `burnett01/rsync-deployments@7.0.1` rsyncs `dist/` to `/var/www/khalilgao.com/` on the VPS via the `deploy` user.

Secrets needed on the repo: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (full `-----BEGIN OPENSSH PRIVATE KEY-----...` block).

Nginx config lives at `deploy/nginx.conf`, pulled onto the VPS via `curl raw.githubusercontent.com/...`. `deploy/first-deploy-checklist.md` has the server-side bring-up steps. **HTTP/3 and Brotli are commented out** — Debian 12's `nginx-extras` is 1.22 (pre-QUIC) and has no `libnginx-mod-http-brotli` package; the comments explain re-enable paths.

## Commit style

Conventional commits with a long body. Every commit co-authored with Claude Opus. Big refactors get multi-paragraph rationale. Look at recent history for the exact tone.

## Spec compliance

`khalilgao-blog-spec.md` is the source of truth. If something in code disagrees with spec, deviations are recorded in commit messages (e.g. the font subsetting commit explains why NotoSerifSC is ~1MB instead of the spec's 500KB target). Before changing an intentional deviation, check git log for the reasoning commit.
