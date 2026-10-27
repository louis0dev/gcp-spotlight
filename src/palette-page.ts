import { send } from './messages';
import { mountPalette } from './ui/palette';

// 오버레이를 띄울 수 없는 페이지에서 쓰는 대체 창. 원래 탭 ID와 프로젝트를 쿼리로 받는다.
const params = new URLSearchParams(location.search);
const tabIdParam = params.get('tabId');
const tabId = tabIdParam ? Number(tabIdParam) : undefined;

const close = () => window.close();
// Spotlight처럼 다른 곳을 클릭하면 닫는다.
window.addEventListener('blur', close);

void mountPalette(document.getElementById('app')!, {
  windowMode: true,
  initialProjectId: params.get('project') ?? undefined,
  authuser: params.get('authuser') ?? undefined,
  onOpen: async (url, newTab) => {
    await send({ type: 'navigate', url, newTab, tabId });
    close();
  },
  onClose: close,
  onOpenOptions: () => void chrome.runtime.openOptionsPage(),
});
