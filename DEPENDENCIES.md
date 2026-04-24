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

## Why Astro itself is not yet 5.x

Astro 5 is new enough that several integrations (see sitemap above)
have shipped 5-only releases that aren't backwards-compatible.
Moving to 5 is a one-commit upgrade once the ecosystem has settled
— revisit in 2026 Q3 or when any single pinned package here has a
working 5-compatible line.
