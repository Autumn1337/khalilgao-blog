export function tagSlug(tag: string): string {
  const slug = tag
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/#/g, ' sharp ')
    .replace(/&/g, ' and ')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'tag';
}

export function tagUrl(tag: string): string {
  return `/tags/${tagSlug(tag)}/`;
}
