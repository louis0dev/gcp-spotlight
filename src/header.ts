import { CONSOLE_ORIGIN, authuserFromUrl, projectFromUrl } from './catalog';
import { isDarkColor } from './color';
import { customProjectFromUrl } from './custom-headers';
import type { Message } from './messages';
import { getCustomEntries, getProjects, type CustomEntry, type Project } from './storage';

// 콘솔 페이지마다 자동으로 실행된다. 지금 보고 있는 프로젝트(?project=)에 설정한 색이 있으면
// 상단 바와 경로 표시줄(breadcrumb) 배경을 그 색으로 칠해 환경(prod/dev 등)을 구분하게 한다.
// 두 영역 모두 배경이 투명하고 body 색이 비치는 구조라 배경만 덮으면 된다 (2026-10 콘솔 DOM 기준).
const isConsole = location.origin === CONSOLE_ORIGIN;
const STRIPE_ID = 'gcp-spotlight-project-stripe';
const STYLE_ID = 'gcp-spotlight-header-color';
const BAR = '#ocb-platform-bar';
const BREADCRUMB = '.pan-shell-top-container';

function css(color: string): string {
  const rules = [`${BAR}, ${BREADCRUMB} { background-color: ${color} !important; }`];
  if (isDarkColor(color)) {
    // 검색창은 자체 배경이 밝아서 제외한다.
    rules.push(
      `${BAR} .cfc-platform-bar-left, ${BAR} .cfc-platform-bar-left *, ${BAR} .cfc-platform-bar-right, ${BAR} .cfc-platform-bar-right *,` +
        ` ${BREADCRUMB}, ${BREADCRUMB} * { color: #fff !important; fill: currentColor; }`,
    );
  }
  return rules.join('\n');
}

let applied: string | undefined;

function apply(color: string | undefined): void {
  if (color === applied) return;
  applied = color;
  document.getElementById(STYLE_ID)?.remove();
  document.getElementById(STRIPE_ID)?.remove();
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return;
  if (!isConsole) {
    const stripe = document.createElement('div');
    stripe.id = STRIPE_ID;
    stripe.setAttribute('aria-hidden', 'true');
    stripe.style.cssText = `all: initial !important; display: block !important; position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; height: 5px !important; background: ${color} !important; z-index: 2147483646 !important; pointer-events: none !important;`;
    document.documentElement.append(stripe);
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css(color);
  (document.head ?? document.documentElement).append(style);
}

let projects: Project[] = [];
let custom: CustomEntry[] = [];

function update(): void {
  const id = isConsole ? projectFromUrl(location.href) : customProjectFromUrl(location.href, custom);
  apply(projects.find((p) => p.id === id)?.color);
}

void Promise.all([getProjects(), getCustomEntries()]).then(([list, entries]) => {
  projects = list;
  custom = entries;
  update();
});

// 설정에서 색이나 커스텀 페이지 소속을 바꾸면 열린 탭에도 바로 반영한다.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync' || (!changes.projects && !changes.customEntries)) return;
  if (changes.projects) projects = Array.isArray(changes.projects.newValue) ? changes.projects.newValue : [];
  if (changes.customEntries) custom = Array.isArray(changes.customEntries.newValue) ? changes.customEntries.newValue : [];
  update();
});

// 콘솔은 페이지를 새로 불러오지 않고 주소만 바꾸므로(프로젝트 전환 포함) 주소 변화를 지켜본다.
let lastHref = location.href;
setInterval(() => {
  if (location.href === lastHref) return;
  lastHref = location.href;
  update();
}, 500);

// 콘솔 페이지가 열렸다는 건 로그인된 상태다. 서비스 목록을 아직 한 번도 못 가져왔으면 background가 가져오게 한다.
if (isConsole) void chrome.runtime.sendMessage({ type: 'sync-products-if-empty', authuser: authuserFromUrl(location.href) } satisfies Message).catch(() => {});
