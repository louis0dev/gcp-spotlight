import { authuserFromUrl, projectFromUrl } from './catalog';
import type { Message, SyncResult } from './messages';
import { NotSignedInError, syncProducts } from './products';
import { getProductSnapshot } from './storage';

const PALETTE_WIDTH = 680;
const PALETTE_HEIGHT = 460;

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'open-spotlight') void openSpotlight(tab);
});

chrome.action.onClicked.addListener((tab) => void openSpotlight(tab));

async function syncNow(authuser?: string): Promise<SyncResult> {
  try {
    const snapshot = await syncProducts(authuser);
    return { status: 'ok', count: snapshot.items.length, fetchedAt: snapshot.fetchedAt };
  } catch (e) {
    if (e instanceof NotSignedInError) return { status: 'auth' };
    return { status: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}

// 처음 설치 후 아직 목록을 못 가져왔으면, 로그인된 콘솔 페이지를 처음 열 때 자동으로 한 번 가져온다.
// 실패해도(형식 변경 등) 페이지를 열 때마다 다시 시도하지 않도록 1시간에 한 번만 시도한다.
const AUTO_SYNC_RETRY_MS = 60 * 60 * 1000;

async function syncIfEmpty(authuser: string): Promise<void> {
  if ((await getProductSnapshot())?.items.length) return;
  const { autoSyncTriedAt } = await chrome.storage.local.get('autoSyncTriedAt');
  if (typeof autoSyncTriedAt === 'number' && Date.now() - autoSyncTriedAt < AUTO_SYNC_RETRY_MS) return;
  await chrome.storage.local.set({ autoSyncTriedAt: Date.now() });
  await syncProducts(authuser).catch((e) => console.warn('서비스 목록 자동 가져오기 실패', e));
}

async function openSpotlight(tab?: chrome.tabs.Tab): Promise<void> {
  // 대체 창이 이미 떠 있으면 닫는다(토글).
  const { paletteWindowId } = await chrome.storage.session.get('paletteWindowId');
  if (typeof paletteWindowId === 'number') {
    await chrome.storage.session.remove('paletteWindowId');
    try {
      await chrome.windows.remove(paletteWindowId);
      return;
    } catch {
      // 이미 닫힌 창
    }
  }

  tab ??= (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0];
  if (tab?.id !== undefined) {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      return;
    } catch {
      // chrome://, 새 탭, 웹스토어 등 주입할 수 없는 페이지 → 대체 창
    }
  }
  await openPaletteWindow(tab);
}

async function openPaletteWindow(tab?: chrome.tabs.Tab): Promise<void> {
  const params = new URLSearchParams();
  if (tab?.id !== undefined) params.set('tabId', String(tab.id));
  const project = projectFromUrl(tab?.url);
  if (project) params.set('project', project);
  params.set('authuser', authuserFromUrl(tab?.url));

  // 지금 보고 있는 창의 가운데 위쪽에 띄운다.
  const base = await chrome.windows.getLastFocused().catch(() => undefined);
  const left = Math.round((base?.left ?? 0) + ((base?.width ?? PALETTE_WIDTH) - PALETTE_WIDTH) / 2);
  const top = Math.round((base?.top ?? 0) + ((base?.height ?? PALETTE_HEIGHT) - PALETTE_HEIGHT) / 4);

  const win = await chrome.windows.create({
    url: chrome.runtime.getURL(`palette.html?${params}`),
    type: 'popup',
    width: PALETTE_WIDTH,
    height: PALETTE_HEIGHT,
    left,
    top,
    focused: true,
  });
  if (win?.id !== undefined) await chrome.storage.session.set({ paletteWindowId: win.id });
}

chrome.windows.onRemoved.addListener(async (windowId) => {
  const { paletteWindowId } = await chrome.storage.session.get('paletteWindowId');
  if (paletteWindowId === windowId) await chrome.storage.session.remove('paletteWindowId');
});

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse, () => sendResponse());
  return true;
});

async function handleMessage(message: Message, sender: chrome.runtime.MessageSender): Promise<unknown> {
  switch (message.type) {
    case 'navigate':
      return navigate(message.url, message.newTab, message.tabId ?? sender.tab?.id);
    case 'open-options':
      return chrome.runtime.openOptionsPage();
    case 'sync-products':
      return syncNow(message.authuser);
    case 'sync-products-if-empty':
      return syncIfEmpty(message.authuser);
  }
}

async function navigate(url: string, newTab: boolean, tabId?: number): Promise<void> {
  const tab = tabId !== undefined ? await chrome.tabs.get(tabId).catch(() => undefined) : undefined;
  if (!tab?.id) {
    await chrome.tabs.create({ url });
    return;
  }
  if (newTab) {
    await chrome.tabs.create({ url, windowId: tab.windowId, index: tab.index + 1 });
  } else {
    await chrome.tabs.update(tab.id, { url, active: true });
  }
  await chrome.windows.update(tab.windowId, { focused: true });
}
