import type { CollectionEntry } from 'astro:content';

/**
 * Strip the `YYYY-MM-DD-` prefix from the Astro-generated slug so
 * URLs stay `/posts/<slug>/` while disk folders keep the date prefix
 * for human-friendly ordering.
 */
export function cleanSlug(post: CollectionEntry<'posts'>): string {
  return post.slug.replace(/^\d{4}-\d{2}-\d{2}-/, '');
}

export function postUrl(post: CollectionEntry<'posts'>): string {
  return `/posts/${cleanSlug(post)}/`;
}
