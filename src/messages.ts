export type Message =
  /** tabId가 없으면 보낸 탭 기준 (content script) */
  | { type: 'navigate'; url: string; newTab: boolean; tabId?: number }
  | { type: 'open-options' }
  /** 콘솔에서 서비스 목록을 지금 다시 가져온다. 응답: SyncResult */
  | { type: 'sync-products'; authuser?: string }
  /** 콘솔 페이지에서 보낸다. 저장된 목록이 없을 때만(처음 설치 직후) 한 번 가져온다. 응답 없음 */
  | { type: 'sync-products-if-empty'; authuser: string };

export type SyncResult = { status: 'ok'; count: number; fetchedAt: number } | { status: 'auth' } | { status: 'error'; message: string };

export function send(message: Message): Promise<void> {
  return chrome.runtime.sendMessage(message);
}

export function syncProductsNow(authuser?: string): Promise<SyncResult> {
  return chrome.runtime.sendMessage({ type: 'sync-products', authuser } satisfies Message);
}
