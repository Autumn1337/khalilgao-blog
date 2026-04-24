import { compile } from '@mdx-js/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkPangu from 'remark-pangu';

const cases = [
  ['K inline-code with {}',
    '其中 `-B = { -b : b ∈ B }` 是 B 关于原点的反射'],
  ['L plain text with bare {}',
    '下面一个例子：{ this is a set } 的意思'],
  ['M multi-block (math+pangu+mermaid)',
    [
      '段首中文 text with some English mixed in',
      '',
      '$$',
      '\\mathrm{NFP}(A, B) \\;=\\; A \\oplus (-B)',
      '$$',
      '',
      'inline `-B = { -b }` snippet',
      '',
      '```mermaid',
      'graph LR',
      '  A[读入] --> B{贪心放置}',
      '```',
      '',
      '结尾 paragraph',
    ].join('\n')],
  ['N inline code with bare {',
    'text `with { inside` more text'],
];

for (const [name, src] of cases) {
  try {
    await compile(src, {
      remarkPlugins: [remarkMath, remarkPangu],
      rehypePlugins: [rehypeKatex],
    });
    console.log(`${name} OK`);
  } catch (e) {
    const msg = e.message.split('\n').slice(0, 2).join(' | ');
    console.log(`${name} FAIL → ${msg}`);
  }
}
