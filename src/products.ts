import { CONSOLE_ORIGIN, ENTRIES, type Entry } from './catalog';
import {
  getCustomEntries,
  getHiddenEntries,
  getProductSnapshot,
  setProductSnapshot,
  type CustomEntry,
  type ProductItem,
  type ProductSnapshot,
} from './storage';

// 콘솔 /products 페이지 HTML에는 탐색 메뉴 전체가
// <script id="datastream_..." type="json">{"SPANNER_SECTION":"[\"Spanner\",\"SPANNER_SECTION\",\"/spanner\",\"SPANNER_SECTION\",\"databases\",[키워드...],...]", ...}</script>
// 형태로 들어 있다. 배열은 [이름, 짧은 ID, 경로, ID, 상위 ID, 키워드, ...] 순서다. 문서 없는 형식이라 언제든 바뀔 수 있다.
const PRODUCTS_URL = `${CONSOLE_ORIGIN}/products`;
const DATASTREAM_RE = /<script id="datastream_[^"]+" type="json"[^>]*>([\s\S]*?)<\/script>/g;

export function parseProductsHtml(html: string): ProductItem[] {
  const raw: unknown[][] = [];
  for (const m of html.matchAll(DATASTREAM_RE)) {
    let block: unknown;
    try {
      block = JSON.parse(m[1]);
    } catch {
      continue;
    }
    if (!block || typeof block !== 'object' || Array.isArray(block)) continue;
    for (const value of Object.values(block)) {
      if (typeof value !== 'string' || !value.startsWith('[')) continue;
      try {
        const a = JSON.parse(value);
        if (Array.isArray(a) && typeof a[0] === 'string' && typeof a[2] === 'string' && typeof a[3] === 'string') raw.push(a);
      } catch {
        // 메뉴 항목이 아닌 값
      }
    }
  }

  type Row = [string, unknown, string, string, unknown, unknown];
  // 실제 페이지가 아닌 항목(경로 변수, 숨김 항목, 테스트 항목)은 뺀다.
  const rows = (raw as Row[]).filter(
    ([title, , path, id]) => path.startsWith('/') && !path.includes(':') && !/^Never Displayed/.test(title) && id !== 'test-dynamic-nav',
  );
  // 검색용 별칭(search_*) 등으로 같은 경로가 여러 번 나온다. 경로마다 별칭이 아닌 항목 하나만 남기고,
  // 빠진 항목의 ID는 남긴 항목으로 연결해 세부 페이지의 상위를 찾을 수 있게 한다.
  const keptByPath = new Map<string, string>();
  for (const [, , path, id] of [...rows].sort((a, b) => Number(a[3].startsWith('search_')) - Number(b[3].startsWith('search_')))) {
    if (!keptByPath.has(path)) keptByPath.set(path, id);
  }
  const canonical = new Map(rows.map(([, , path, id]) => [id, keptByPath.get(path)!]));
  // 메뉴 안 이름(예: /bigquery = "SQL 작업공간")보다 검색용 별칭의 제품 이름("BigQuery")이 알아보기 쉽다.
  const aliasTitle = new Map(rows.filter(([, , , id]) => id.startsWith('search_')).map(([title, , path]) => [path, title]));
  const titlesByPath = new Map<string, Set<string>>();
  for (const [title, , path] of rows) titlesByPath.set(path, (titlesByPath.get(path) ?? new Set()).add(title));

  const items: ProductItem[] = [];
  for (const [ownTitle, , path, id, parent, keywords] of rows) {
    if (keptByPath.get(path) !== id) continue;
    const title = aliasTitle.get(path) ?? ownTitle;
    const parentId = typeof parent === 'string' ? canonical.get(parent) : undefined;
    const otherTitles = [...titlesByPath.get(path)!].filter((t) => t !== title);
    items.push({
      id,
      title,
      path,
      ...(parentId && parentId !== id ? { parentId } : {}),
      keywords: [...otherTitles, ...(Array.isArray(keywords) ? keywords.filter((k): k is string => typeof k === 'string') : [])],
    });
  }
  return items;
}

export class NotSignedInError extends Error {}

let syncing: Promise<ProductSnapshot> | undefined;

/** 콘솔에서 서비스 목록을 가져와 저장한다. 입력창의 "목록 갱신"이나 설정의 "지금 가져오기"로만 부른다. */
export function syncProducts(authuser = '0'): Promise<ProductSnapshot> {
  syncing ??= (async () => {
    try {
      // 화면을 영어로만 보여주므로 메뉴 이름도 영어(hl=en)로 받는다.
      const url = new URL(PRODUCTS_URL);
      url.searchParams.set('hl', 'en');
      if (authuser !== '0') url.searchParams.set('authuser', authuser);
      const res = await fetch(url.toString(), { credentials: 'include' });
      // 로그인이 안 되어 있으면 accounts.google.com으로 넘어간다.
      if (!res.url.startsWith(CONSOLE_ORIGIN)) throw new NotSignedInError();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = parseProductsHtml(await res.text());
      // 형식이 바뀌어 거의 못 읽었으면 기존 목록을 지우지 않는다.
      if (items.length < 50) throw new Error(`Could not read the service list from the console page (${items.length} items)`);
      const snapshot = { fetchedAt: Date.now(), items };
      await setProductSnapshot(snapshot);
      return snapshot;
    } finally {
      syncing = undefined;
    }
  })();
  return syncing;
}

function productEntries(items: ProductItem[]): Entry[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  return items.map((item) => {
    const parent = item.parentId ? byId.get(item.parentId) : undefined;
    return {
      id: `console:${item.id}`,
      kind: parent ? 'page' : 'service',
      title: item.title,
      ...(parent ? { parent: parent.title } : {}),
      path: item.path,
      ownFields: [item.title],
      parentFields: parent ? [parent.title] : [],
      keywordFields: item.keywords,
    };
  });
}

function customEntry(c: CustomEntry): Entry {
  // c.id는 CUSTOM_ID_PREFIX로 시작한다.
  return { id: c.id, projectId: c.projectId, kind: 'service', title: c.title, path: c.path, ownFields: [c.title, c.path], parentFields: [] };
}

export interface EntrySource {
  /** 숨김 처리 전 전체 목록 (설정 화면용) */
  all: Entry[];
  /** console: 콘솔에서 가져온 목록, builtin: 아직 못 가져와서 내장 목록 */
  origin: 'console' | 'builtin';
  fetchedAt?: number;
}

export async function loadEntrySource(): Promise<EntrySource> {
  const snapshot = await getProductSnapshot();
  if (snapshot?.items.length) return { all: productEntries(snapshot.items), origin: 'console', fetchedAt: snapshot.fetchedAt };
  return { all: ENTRIES, origin: 'builtin' };
}

export const CUSTOM_ID_PREFIX = 'custom:';

export interface SearchData {
  /** 직접 등록한 항목 + (가져온 목록 또는 내장 목록) − 숨긴 항목 */
  entries: Entry[];
}

export async function loadSearchData(): Promise<SearchData> {
  const [source, hidden, custom] = await Promise.all([loadEntrySource(), getHiddenEntries(), getCustomEntries()]);
  const hiddenSet = new Set(hidden);
  return {
    entries: [...custom.map(customEntry), ...source.all.filter((e) => !hiddenSet.has(e.id))],
  };
}
