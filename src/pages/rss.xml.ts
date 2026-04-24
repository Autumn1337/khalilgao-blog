import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { postUrl } from '../lib/post-url';

const SITE_TITLE = "Khalil's Notes";
const SITE_DESC =
  '长篇技术笔记，聚焦 AI 工具链、C/C++ 优化、算法竞赛与系统工程。';

export async function GET(context: APIContext) {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const sorted = posts.sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  const container = await AstroContainer.create();

  const items = await Promise.all(
    sorted.map(async (post) => {
      const { Content } = await post.render();
      const html = await container.renderToString(Content);
      return {
        title: post.data.title,
        pubDate: post.data.pubDate,
        description: post.data.description ?? '',
        link: postUrl(post),
        content: html,
        categories: post.data.tags,
      };
    }),
  );

  return rss({
    title: SITE_TITLE,
    description: SITE_DESC,
    site: context.site ?? 'https://khalilgao.com',
    items,
    customData: `<language>zh-CN</language><copyright>© ${new Date().getFullYear()} Hewen Gao</copyright>`,
    xmlns: {
      content: 'http://purl.org/rss/1.0/modules/content/',
    },
  });
}
