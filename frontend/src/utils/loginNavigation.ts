import { isIdeaId } from '@/utils/ideas';

const fallback = '/pitch-board';
const origin = 'https://edison.invalid';

export function loginHref(destination: string): string {
  return `/login?next=${encodeURIComponent(destination)}`;
}

export function postLoginDestination(value: string | null): string {
  if (!value?.startsWith('/')) return fallback;

  let url: URL;
  try {
    url = new URL(value, origin);
  } catch {
    return fallback;
  }
  if (url.origin !== origin) return fallback;
  if (['/pitch-board', '/my-ideas', '/saved'].includes(url.pathname)) return url.pathname;
  if (url.pathname.startsWith('/ideas/') && isIdeaId(url.pathname.slice('/ideas/'.length))) return url.pathname;

  if (url.pathname === '/publish') {
    const draft = url.searchParams.get('draft');
    if (!draft || !isIdeaId(draft)) return '/publish';
    const params = new URLSearchParams({ draft });
    if (url.searchParams.get('step') === '2') params.set('step', '2');
    return `/publish?${params}`;
  }

  return fallback;
}
