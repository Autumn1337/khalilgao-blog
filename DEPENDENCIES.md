# Pinned dependencies — why they're locked

Dependencies in `package.json` that are intentionally held back from
`npm update` / `^` semver. Anything not listed here is free to float
within its declared major.

## @astrojs/sitemap → `~3.2.1`

3.7.0 introduced a reliance on the `astro:routes:resolved` hook,
which ships in **Astro 5** but not Astro 4. On our Astro 4.16.x
install the hook never fires, the sitemap integration's `_routes`
stays `undefined`, and `astro build` crashes at the sitemap
generation step with:

```
Cannot read properties of undefined (reading 'reduce')
  at astro:build:done (@astrojs/sitemap/dist/index.js:85:37)
```

**When to unpin:** after upgrading to Astro 5. At that point, bump
to the latest `@astrojs/sitemap` and drop the `~` constraint.

Evidence: scanned versions 3.2.1 → 3.7.2 for the new hook name,
3.7.0 is the first to use it.

## @astrojs/rss → `^4.0.11`

Not pinned (uses `^`), but kept at 4.x because 5.x changes the
`pagesGlobToRssItems` / `content` field contract. Our RSS route
(`src/pages/rss.xml.ts`) uses `experimental_AstroContainer` for
full-content rendering; regression-test that route after any rss
major bump.

## remark-pangu → `^2.2.0`

`^1.x` was the series the spec references but has been unpublished
from some semver paths. 2.x rewrite works fine with remark 15 /
MDX 3. No regressions observed.

## satori + @resvg/resvg-js → `^0.26.0` / `^2.6.2`

Drive the per-post OG image route at `src/pages/og/[...slug].png.ts`
(see CLAUDE.md → "OG image generation"). satori does the JSX-tree →
SVG layout (yoga-wasm under the hood); @resvg/resvg-js rasterizes
SVG → PNG.

Why these two and not alternatives:

- **vs `@vercel/og`**: pulls in the same satori under the hood plus
  Vercel-specific edge runtime helpers we don't need.
- **vs `astro-og-canvas`**: convenient wrapper but locks layout into
  a small set of presets. We want the freedom to evolve the card
  design without fighting an opinionated component API.
- **vs server-side `puppeteer` / `playwright`**: heavyweight headless
  Chromium just to render a 1200×630 monochrome card is overkill.

**Constraint to remember:** satori only accepts OTF / TTF for fonts —
woff2 throws "Unsupported OpenType signature wOF2". The subset script
(`scripts/subset-noto-serif-sc.py`) has to emit a TTF copy alongside
the woff2 client subset for this reason. If you try to feed satori
the public/fonts/*.woff2 directly, the OG route will 500 at build time.

**When to unpin:** satori 0.x line moves quickly; 1.0 will likely
break the JSX-object API. Hold on `^0.26` until the route renders
cleanly on a fresh install of the next minor.

## Why Astro itself is not yet 5.x

Astro 5 is new enough that several integrations (see sitemap above)
have shipped 5-only releases that aren't backwards-compatible.
Moving to 5 is a one-commit upgrade once the ecosystem has settled
— revisit in 2026 Q3 or when any single pinned package here has a
working 5-compatible line.
