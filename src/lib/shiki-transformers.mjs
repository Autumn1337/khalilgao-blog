/**
 * Parse a code-fence meta string like `nfp.cpp {1,3-5}` into a filename
 * and a set of line numbers to highlight.
 *
 * @param {string} meta
 * @returns {{ filename?: string, highlights: Set<number> }}
 */
function parseMeta(meta) {
  const highlights = new Set();
  let filename;
  const tokens = meta.trim().split(/\s+/).filter(Boolean);
  for (const tok of tokens) {
    const hl = tok.match(/^\{([\d,\-\s]+)\}$/);
    if (hl) {
      for (const part of hl[1].split(',')) {
        const range = part.trim().match(/^(\d+)(?:-(\d+))?$/);
        if (!range) continue;
        const a = Number(range[1]);
        const b = range[2] ? Number(range[2]) : a;
        for (let n = Math.min(a, b); n <= Math.max(a, b); n++) highlights.add(n);
      }
      continue;
    }
    if (!filename && /[a-zA-Z._][a-zA-Z0-9._\-/]*\.[a-zA-Z0-9]+$/.test(tok)) {
      filename = tok;
    }
  }
  return { filename, highlights };
}

function el(tagName, properties = {}, children = []) {
  return { type: 'element', tagName, properties, children };
}

/**
 * Shiki transformer that:
 *   1. adds `.highlighted` class to .line spans listed in `{1,3-5}` meta
 *   2. sets `data-filename="..."` on <pre> when a filename is present
 *   3. wraps <pre> in <figure class="code-block"> plus a copy button.
 *
 * The click handler lives once in BaseLayout (delegated).
 *
 * @returns {import('shiki').ShikiTransformer}
 */
export function transformerCodeChrome() {
  return {
    name: 'khalil/code-chrome',
    preprocess(_code, options) {
      const raw = options.meta?.__raw ?? '';
      const parsed = parseMeta(raw);
      this.meta.__chrome = parsed;
    },
    line(node, line) {
      const parsed = this.meta.__chrome;
      if (!parsed || !parsed.highlights.has(line)) return;
      // shiki uses `properties.class` as a plain string — keep that shape
      // so hast-util-to-html doesn't emit a duplicate class attribute.
      const existing =
        typeof node.properties.class === 'string' ? node.properties.class : '';
      const classes = existing.split(/\s+/).filter(Boolean);
      if (!classes.includes('highlighted')) classes.push('highlighted');
      node.properties.class = classes.join(' ');
    },
    pre(node) {
      const parsed = this.meta.__chrome;
      if (parsed?.filename) {
        node.properties['data-filename'] = parsed.filename;
      }
    },
    root(node) {
      const parsed = this.meta.__chrome;
      const preIndex = node.children.findIndex(
        (c) => c.type === 'element' && c.tagName === 'pre',
      );
      if (preIndex === -1) return;
      const pre = node.children[preIndex];

      const wrapperProps = { className: ['code-block'] };
      if (parsed?.filename) wrapperProps['data-filename'] = parsed.filename;

      const copyBtn = el(
        'button',
        {
          type: 'button',
          className: ['code-copy-btn'],
          'aria-label': '复制代码',
          'data-code-copy': '',
        },
        [
          el(
            'svg',
            {
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: 'currentColor',
              'stroke-width': 1.6,
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round',
              'aria-hidden': 'true',
            },
            [
              el('rect', { x: 9, y: 9, width: 12, height: 12, rx: 2 }),
              el('path', {
                d: 'M5 15H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2',
              }),
            ],
          ),
        ],
      );

      const wrapper = el('figure', wrapperProps, [copyBtn, pre]);
      node.children.splice(preIndex, 1, wrapper);
    },
  };
}
