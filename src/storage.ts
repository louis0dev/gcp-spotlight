export interface Project {
  id: string;
  alias?: string;
  /** 콘솔 상단(헤더) 배경색 "#rrggbb". 없으면 콘솔 기본색 그대로 둔다. */
  color?: string;
}

export interface UsageRecord {
  count: number;
  last: number;
}

export type Usage = Record<string, UsageRecord>;

/** 콘솔 /products 페이지에서 가져온 서비스 목록 */
export interface ProductItem {
  id: string;
  title: string;
  path: string;
  /** 상위 항목 ID. 상위가 분류(예: databases)면 없음 → 서비스, 있으면 세부 페이지 */
  parentId?: string;
  keywords: string[];
}

export interface ProductSnapshot {
  fetchedAt: number;
  items: ProductItem[];
}

/** 설정에서 직접 등록한 항목 */
export interface CustomEntry {
  id: string;
  /** 실제 프로젝트 ID. 이전 버전에서 등록한 항목은 모든 프로젝트에서 표시한다. */
  projectId?: string;
  title: string;
  path: string;
}

// 프로젝트는 sync(기기 간 동기화), 사용 기록은 local에 둔다.
export async function getProjects(): Promise<Project[]> {
  const { projects } = await chrome.storage.sync.get('projects');
  return Array.isArray(projects) ? projects : [];
}

export async function setProjects(projects: Project[]): Promise<void> {
  await chrome.storage.sync.set({ projects });
}

export async function getUsage(): Promise<Usage> {
  const { usage } = await chrome.storage.local.get('usage');
  return usage ?? {};
}

export async function clearUsage(): Promise<void> {
  await chrome.storage.local.remove('usage');
}

export async function recordUsage(entryId: string): Promise<void> {
  const usage = await getUsage();
  const prev = usage[entryId];
  usage[entryId] = { count: (prev?.count ?? 0) + 1, last: Date.now() };
  await chrome.storage.local.set({ usage });
}

/** 자주 찾은 서비스를 숫자키와 함께 누를 키. none이면 단축키를 쓰지 않는다. */
export type FavoriteModifier = 'ctrl' | 'alt' | 'none';

export interface Settings {
  favoriteModifier: FavoriteModifier;
}

export const IS_MAC = /Mac/i.test(navigator.platform);

// Windows/Linux Chrome은 Ctrl+숫자를 탭 전환에 쓰므로 기본값을 Alt로 둔다.
const DEFAULT_SETTINGS: Settings = { favoriteModifier: IS_MAC ? 'ctrl' : 'alt' };

export async function getSettings(): Promise<Settings> {
  const { settings } = await chrome.storage.sync.get('settings');
  const merged = { ...DEFAULT_SETTINGS, ...(settings ?? {}) };
  return { favoriteModifier: merged.favoriteModifier };
}

export async function setSettings(settings: Settings): Promise<void> {
  await chrome.storage.sync.set({ settings });
}

/** 화면에 보여줄 키 이름. macOS는 기호(⌃, ⌥), 그 밖에는 Ctrl/Alt. */
export function modifierLabel(modifier: FavoriteModifier, isMac: boolean): string {
  if (modifier === 'ctrl') return isMac ? '⌃' : 'Ctrl+';
  if (modifier === 'alt') return isMac ? '⌥' : 'Alt+';
  return '';
}

// 가져온 목록은 크기가 커서(수백 KB) local에, 숨김/직접 등록은 sync에 둔다.
export async function getProductSnapshot(): Promise<ProductSnapshot | undefined> {
  const { products } = await chrome.storage.local.get('products');
  return products;
}

export async function setProductSnapshot(products: ProductSnapshot): Promise<void> {
  await chrome.storage.local.set({ products });
}

export async function getHiddenEntries(): Promise<string[]> {
  const { hiddenEntries } = await chrome.storage.sync.get('hiddenEntries');
  return Array.isArray(hiddenEntries) ? hiddenEntries : [];
}

export async function setHiddenEntries(hiddenEntries: string[]): Promise<void> {
  await chrome.storage.sync.set({ hiddenEntries });
}

export async function getCustomEntries(): Promise<CustomEntry[]> {
  const { customEntries } = await chrome.storage.sync.get('customEntries');
  return Array.isArray(customEntries) ? customEntries : [];
}

export async function setCustomEntries(customEntries: CustomEntry[]): Promise<void> {
  await chrome.storage.sync.set({ customEntries });
}

export async function getLastProject(): Promise<string | undefined> {
  const { lastProject } = await chrome.storage.local.get('lastProject');
  return typeof lastProject === 'string' ? lastProject : undefined;
}

export async function setLastProject(projectId: string): Promise<void> {
  await chrome.storage.local.set({ lastProject: projectId });
}
