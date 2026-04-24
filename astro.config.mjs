import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkPangu from 'remark-pangu';
import { visit } from 'unist-util-visit';
import { transformerCodeChrome } from './src/lib/shiki-transformers.mjs';

/**
 * Rewrite ```mermaid code fences into
 *   <pre class="mermaid" data-graph="src">src</pre>
 * so the client Mermaid component can render them on demand.
 */
function rehypeMermaid() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'pre') return;
      const code = node.children?.[0];
      if (!code || code.type !== 'element' || code.tagName !== 'code') return;
      const classes = code.properties?.className;
      if (!Array.isArray(classes) || !classes.includes('language-mermaid')) return;
      const src = (code.children?.[0]?.value ?? '').trim();
      node.properties = { className: ['mermaid'], 'data-graph': src };
      node.children = [{ type: 'text', value: src }];
    });
  };
}

export default defineConfig({
  site: 'https://khalilgao.com',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/404'),
    }),
  ],
  markdown: {
    remarkPlugins: [remarkMath, remarkPangu],
    rehypePlugins: [rehypeKatex, rehypeMermaid],
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
  },
});
