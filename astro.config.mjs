import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkPangu from 'remark-pangu';
import { visit } from 'unist-util-visit';
import { transformerCodeChrome } from './src/lib/shiki-transformers.mjs';

/**
 * Rewrite ```mermaid fences at the markdown (mdast) level so Shiki
 * never sees them as code. Replaces the code node with a raw html
 * node — a <pre class="mermaid" data-graph="src"> element that the
 * client-side Mermaid component (PostLayout) finds and renders.
 */
function remarkMermaid() {
  const escape = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  return (tree) => {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'mermaid' || index == null || !parent) return;
      const src = node.value ?? '';
      const escaped = escape(src);
      parent.children[index] = {
        type: 'html',
        value: `<pre class="mermaid" data-graph="${escaped}">${escaped}</pre>`,
      };
    });
  };
}

/**
 * Wrap every <table> in <div class="table-wrap"> at the hast level so
 * wide tables scroll inside themselves on narrow viewports instead of
 * pushing the whole page horizontally. CSS in typography.css gives the
 * wrapper `overflow-x: auto`.
 *
 * Runs at the rehype stage because that's where tables exist as real
 * element nodes — mdast tables are higher-level and don't resolve
 * inline HTML the same way.
 */
function rehypeWrapTables() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'table' || index == null || !parent) return;
      // Don't re-wrap if a previous pass already did.
      if (
        parent.type === 'element' &&
        parent.tagName === 'div' &&
        Array.isArray(parent.properties?.className) &&
        parent.properties.className.includes('table-wrap')
      ) {
        return;
      }
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['table-wrap'] },
        children: [node],
      };
    });
  };
}

export default defineConfig({
  site: 'https://khalilgao.com',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  devToolbar: {
    enabled: false,
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/404'),
    }),
  ],
  markdown: {
    remarkPlugins: [remarkMath, remarkPangu, remarkMermaid],
    rehypePlugins: [rehypeKatex, rehypeWrapTables],
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark-dimmed',
      },
      wrap: false,
      transformers: [transformerCodeChrome()],
    },
  },
  vite: {
    ssr: {
      noExternal: ['medium-zoom'],
    },
    // WSL + NTFS (/mnt/e) doesn't deliver inotify events to the Vite
    // watcher, so HMR never fires on file edits. Polling is the only
    // reliable way to pick up changes across that filesystem boundary.
    server: {
      watch: {
        usePolling: true,
        interval: 300,
      },
    },
  },
});
