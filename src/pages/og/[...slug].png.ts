import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { cleanSlug } from '../../lib/post-url';
import { fmtISODate } from '../../lib/date-format';

/**
 * Dynamic OG image per post: /og/<slug>.png
 *
 * Build-time only — rendered once via satori (SVG) + resvg-js (PNG)
 * and written into dist/. The fonts live in fonts-source/ (outside
 * public/, so they never ship to clients); they're TTF because
 * satori's layout engine doesn't accept woff2.
 *
 * Layout: 1200×630 with the post title in 500-weight serif and a
 * muted footer carrying the pub date + site name. Intentionally
 * monochrome to stay on-brand with the site palette (#fdfdfc / #1a1a1a).
 */

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getCollection('posts', ({ data }) =>
    import.meta.env.PROD ? !data.draft : true,
  );
  return posts.map((post) => ({
    params: { slug: cleanSlug(post) },
    props: { post },
  }));
};

const FONTS_DIR = path.join(process.cwd(), 'fonts-source');
const fontHeading = fs.readFileSync(
  path.join(FONTS_DIR, 'NotoSerifSC-500-og.ttf'),
);
const fontBody = fs.readFileSync(
  path.join(FONTS_DIR, 'NotoSerifSC-400-og.ttf'),
);

const COLORS = {
  bg: '#fdfdfc',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#9a9a9a',
  border: '#e5e2dc',
} as const;

export const GET: APIRoute = async ({ props }) => {
  const { post } = props as { post: Awaited<ReturnType<typeof getCollection>>[number] };
  const title = post.data.title;
  const date = fmtISODate(post.data.pubDate);

  const tree = {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '80px',
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: 'NotoSerifSC',
      },
      children: [
        // Top mark — small tag-style label
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              fontSize: 22,
              color: COLORS.muted,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 500,
            },
            children: "Khalil's Notes",
          },
        },
        // Title block
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: 68,
              lineHeight: 1.28,
              fontWeight: 500,
              color: COLORS.text,
              maxWidth: '1040px',
            },
            children: title,
          },
        },
        // Footer — date
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              fontSize: 28,
              color: COLORS.muted,
              fontWeight: 400,
              borderTop: `1px solid ${COLORS.border}`,
              paddingTop: 28,
            },
            children: [
              {
                type: 'span',
                props: { children: date },
              },
              {
                type: 'span',
                props: {
                  style: {
                    margin: '0 16px',
                    color: COLORS.faint,
                  },
                  children: '·',
                },
              },
              {
                type: 'span',
                props: { children: 'khalilgao.com' },
              },
            ],
          },
        },
      ],
    },
  };

  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'NotoSerifSC',
        data: fontBody,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'NotoSerifSC',
        data: fontHeading,
        weight: 500,
        style: 'normal',
      },
    ],
  });

  const png = new Resvg(svg).render().asPng();
  // resvg-js returns a Node Buffer; cast for DOM Response body typing.
  return new Response(png as unknown as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
