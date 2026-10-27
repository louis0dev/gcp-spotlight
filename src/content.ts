import { authuserFromUrl, projectFromUrl } from './catalog';
import { send } from './messages';
import { mountPalette } from './ui/palette';

// 단축키를 누를 때마다 background가 이 스크립트를 주입한다. 이미 열려 있으면 닫는다(토글).
const HOST_ID = 'gcp-spotlight-host';
const CLOSE_EVENT = 'gcp-spotlight-close';

function main(): void {
  const existing = document.getElementById(HOST_ID);
  if (existing) {
    existing.dispatchEvent(new Event(CLOSE_EVENT));
    // 확장 프로그램을 다시 불러와서 이전 스크립트가 응답하지 않는 경우
    existing.remove();
    return;
  }

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'all: initial; position: fixed; inset: 0; z-index: 2147483647;';
  const shadow = host.attachShadow({ mode: 'open' });
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  // 입력 중인 키가 페이지 단축키(예: 콘솔의 "/")로 전달되지 않게 막는다.
  const stop = (e: Event) => e.stopPropagation();
  for (const type of ['keydown', 'keyup', 'keypress']) host.addEventListener(type, stop);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    host.remove();
    previousFocus?.focus();
  };
  host.addEventListener(CLOSE_EVENT, close);
  document.documentElement.append(host);

  void mountPalette(shadow, {
    initialProjectId: projectFromUrl(location.href),
    currentUrl: location.href,
    authuser: authuserFromUrl(location.href),
    onOpen: (url, newTab) => {
      close();
      if (newTab) void send({ type: 'navigate', url, newTab: true });
      else location.assign(url);
    },
    onClose: close,
    onOpenOptions: () => void send({ type: 'open-options' }),
  });
}

main();
