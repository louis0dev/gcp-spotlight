import type { Entry } from './catalog';
import type { Project, Usage } from './storage';

/** query 한 단어가 text에 얼마나 잘 맞는지. 0이면 불일치. */
export function scoreText(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (!q) return 1;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  const idx = t.indexOf(q);
  if (idx > 0) return /[a-z0-9가-힣]/.test(t[idx - 1]) ? 40 : 60;
  // 단어 첫 글자 (예: "cr" → "cloud run")
  const initials = t
    .split(/[^a-z0-9가-힣]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('');
  return initials.length > 1 && initials.startsWith(q) ? 30 : 0;
}

function bestField(token: string, fields: string[]): number {
  let best = 0;
  for (const f of fields) best = Math.max(best, scoreText(token, f));
  return best;
}

function tokenize(query: string): string[] {
  return query.trim().split(/\s+/).filter(Boolean);
}

export function scoreEntry(query: string, entry: Entry): number {
  const tokens = tokenize(query);
  if (tokens.length === 0) return 1;
  let total = 0;
  for (const token of tokens) {
    // 소속 서비스 이름으로만 맞은 세부 페이지는 서비스 자체보다 아래에 오도록 낮춘다.
    const s = Math.max(
      bestField(token, entry.ownFields),
      bestField(token, entry.parentFields) * 0.9,
      bestField(token, entry.keywordFields ?? []) * 0.8,
    );
    if (s === 0) return 0;
    total += s;
  }
  return total / tokens.length;
}

/** 많이 연 순서, 같으면 최근에 연 순서. 안 쓴 항목은 0으로 친다. */
function byUsage(usage: Usage, a: string, b: string): number {
  return (usage[b]?.count ?? 0) - (usage[a]?.count ?? 0) || (usage[b]?.last ?? 0) - (usage[a]?.last ?? 0);
}

// 이 점수 이상(정확히 일치, 앞부분 일치, 단어 시작 일치)이면 잘 맞은 결과로 보고 사용 횟수를 우선한다.
const STRONG_MATCH = 60;

export function entriesForProject(entries: Entry[], projectId?: string): Entry[] {
  return entries.filter((entry) => !entry.projectId || entry.projectId === projectId);
}

export function searchEntries(query: string, entries: Entry[], usage: Usage, projectId?: string): Entry[] {
  entries = entriesForProject(entries, projectId);
  if (!query.trim()) {
    // 빈 입력: 한 번이라도 연 항목만, 많이 쓴 순서로
    return entries.filter((e) => usage[e.id]).sort((a, b) => byUsage(usage, a.id, b.id));
  }
  // 검색어에 맞는 직접 등록 항목을 먼저 표시한다. 각 그룹 안에서는 기존 점수/사용 빈도 순서를 유지한다.
  return entries
    .map((entry, i) => ({ entry, i, score: scoreEntry(query, entry) }))
    .filter((r) => r.score > 0)
    .sort(
      (a, b) =>
        Number(b.entry.id.startsWith('custom:')) - Number(a.entry.id.startsWith('custom:')) ||
        Number(b.score >= STRONG_MATCH) - Number(a.score >= STRONG_MATCH) ||
        byUsage(usage, a.entry.id, b.entry.id) ||
        b.score - a.score ||
        a.i - b.i,
    )
    .map((r) => r.entry);
}

export function searchProjects(query: string, projects: Project[]): Project[] {
  const q = query.trim();
  if (!q) return projects;
  return projects
    .map((p, i) => ({
      p,
      i,
      // 별칭이 맞으면 ID보다 우선
      score: Math.max(p.alias ? scoreText(q, p.alias) * 1.1 : 0, scoreText(q, p.id)),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((r) => r.p);
}
