import type { CustomEntry } from './storage';

/** 외부 UI만 대상으로 한다. 콘솔 경로는 기존 콘솔 헤더 처리를 쓴다. */
function externalUrl(path: string): URL | undefined {
  try {
    const url = new URL(path);
    if (!['http:', 'https:'].includes(url.protocol) || url.hostname === 'console.cloud.google.com') return undefined;
    return url;
  } catch {
    return undefined;
  }
}

export function customHeaderOrigins(entries: CustomEntry[]): string[] {
  return [...new Set(entries.filter((entry) => entry.projectId).flatMap((entry) => {
    const url = externalUrl(entry.path);
    // Chrome host patterns apply to all ports on a host.
    return url ? [`${url.protocol}//${url.hostname}/*`] : [];
  }))].sort();
}

/** 같은 사이트 안의 화면 이동도 따라가되 프로젝트가 모호하면 색을 지정하지 않는다. */
export function customProjectFromUrl(href: string, entries: CustomEntry[]): string | undefined {
  const current = externalUrl(href);
  if (!current) return undefined;
  const candidates = entries.flatMap((entry) => {
    const url = externalUrl(entry.path);
    return entry.projectId && url?.origin === current.origin ? [{ projectId: entry.projectId, url }] : [];
  });
  const paths = candidates.filter(({ url }) => {
    const base = url.pathname.replace(/\/$/, '');
    return current.pathname === base || current.pathname.startsWith(`${base}/`);
  });
  const longest = Math.max(...paths.map(({ url }) => url.pathname.length));
  const matches = paths.length ? paths.filter(({ url }) => url.pathname.length === longest) : candidates;
  const projects = new Set(matches.map(({ projectId }) => projectId));
  return projects.size === 1 ? [...projects][0] : undefined;
}
