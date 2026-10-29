import { CONSOLE_ORIGIN, buildConsoleUrl, projectFromUrl, type Entry } from '../catalog';
import { isDarkColor } from '../color';
import { syncProductsNow } from '../messages';
import { CUSTOM_ID_PREFIX, loadSearchData } from '../products';
import { entriesForProject, searchEntries, searchProjects } from '../search';
import {
  clearUsage,
  getLastProject,
  getProjects,
  getSettings,
  getUsage,
  IS_MAC,
  modifierLabel,
  recordUsage,
  setLastProject,
  type FavoriteModifier,
  type Project,
  type Usage,
} from '../storage';
import css from './palette.css?inline';

export interface PaletteOptions {
  /** 현재 탭 URL의 ?project= 값. 설정에 없는 ID면 무시한다 (pickInitialProject). */
  initialProjectId?: string;
  /** 입력창을 띄운 페이지 주소. 콘솔 페이지면 프로젝트만 바꿔 그 페이지를 다시 연다. */
  currentUrl?: string;
  /** 현재 탭 URL의 ?authuser= 값 */
  authuser?: string;
  /** 대체 창(별도 popup window)에 띄울 때 true */
  windowMode?: boolean;
  onOpen(url: string, newTab: boolean): void;
  onClose(): void;
  onOpenOptions(): void;
}

type Item = { kind: 'entry'; entry: Entry } | { kind: 'project'; project: Project } | { kind: 'setup' };

/** 입력창이 하는 일: service = 서비스 검색, project = Tab으로 들어간 프로젝트 검색 */
type Mode = 'service' | 'project';

const MAX_ITEMS = 50;
/** 새 탭으로 열 때 함께 누르는 키 (Enter, 클릭) */
const NEW_TAB_KEY = IS_MAC ? '⌘' : 'Ctrl+';
/** 입력창 아래 "자주 찾은 서비스"에 보여줄 개수. Ctrl+1~9로 연다. */
const MAX_FAVORITES = 6;
const SERVICE_PLACEHOLDER = 'Search services · @ to pick a project';
const PROJECT_PLACEHOLDER = 'Search projects · Tab to go back';

// 입력 중인 @토큰 (커서 바로 앞에 공백 없이 붙어 있는 것)
const ACTIVE_AT_RE = /(^|\s)@(\S*)$/;
// 뒤에 공백이 붙어 입력이 끝난 @토큰
const DONE_AT_RE = /(^|\s)@(\S+)(?=\s)/g;
const ANY_AT_RE = /(^|\s)@\S*/g;

export async function mountPalette(container: ShadowRoot | HTMLElement, opts: PaletteOptions): Promise<void> {
  const [projects, usage, lastProject, data, settings] = await Promise.all([
    getProjects(),
    getUsage(),
    getLastProject(),
    loadSearchData(),
    getSettings(),
  ]);
  new Palette(
    container,
    opts,
    projects,
    data.entries,
    usage,
    pickInitialProject(projects, opts.initialProjectId, lastProject),
    settings.favoriteModifier,
  );
}

/**
 * 창을 열 때마다 설정의 프로젝트 목록을 기준으로 고른다.
 * 현재 탭 주소의 프로젝트 → 마지막으로 고른 프로젝트 → 목록의 첫 프로젝트 순서이고, 목록에 없는 ID는 쓰지 않는다.
 */
function pickInitialProject(projects: Project[], fromUrl: string | undefined, last: string | undefined): string | undefined {
  if (projects.length === 0) return fromUrl ?? last;
  const registered = (id: string | undefined) => (id && projects.some((p) => p.id === id) ? id : undefined);
  return registered(fromUrl) ?? registered(last) ?? projects[0].id;
}

class Palette {
  private mode: Mode = 'service';
  private savedQuery = '';
  private items: Item[] = [];
  private selected = 0;
  private readonly authuser: string;

  private readonly root: HTMLDivElement;
  private readonly chip: HTMLButtonElement;
  private readonly input: HTMLInputElement;
  private readonly list: HTMLUListElement;
  private readonly refreshButton: HTMLButtonElement;
  private readonly favs: HTMLDivElement;

  constructor(
    container: ShadowRoot | HTMLElement,
    private readonly opts: PaletteOptions,
    private readonly projects: Project[],
    private entries: Entry[],
    private usage: Usage,
    private projectId: string | undefined,
    private readonly favoriteModifier: FavoriteModifier,
  ) {
    this.authuser = opts.authuser ?? '0';
    const style = document.createElement('style');
    style.textContent = css;

    this.root = document.createElement('div');
    this.root.className = opts.windowMode ? 'gs-root gs-window' : 'gs-root';
    this.root.innerHTML = `
      <div class="gs-panel" role="dialog" aria-label="GCP Spotlight">
        <div class="gs-bar">
          <button type="button" class="gs-chip" title="Switch project (Tab)"></button>
          <input class="gs-input" type="text" spellcheck="false" autocomplete="off" />
        </div>
        <div class="gs-favs" aria-label="Frequently used services"></div>
        <ul class="gs-list" role="listbox"></ul>
        <div class="gs-footer">
          <span><kbd>↑↓</kbd> Move</span>
          <span><kbd>Enter</kbd> Open</span>
          <span><kbd>${NEW_TAB_KEY}Enter</kbd> New tab</span>
          <span><kbd>Tab</kbd> Project</span>
          <span><kbd>Esc</kbd> Close</span>
          <button type="button" class="gs-clear" title="Clear history: frequently used services and usage counts">Clear</button>
          <button type="button" class="gs-refresh" title="Refresh the service list from the console's All products page">Refresh</button>
          <button type="button" class="gs-settings">Settings</button>
        </div>
      </div>`;
    this.chip = this.root.querySelector('.gs-chip')!;
    this.input = this.root.querySelector('.gs-input')!;
    this.list = this.root.querySelector('.gs-list')!;
    this.favs = this.root.querySelector('.gs-favs')!;

    this.input.placeholder = SERVICE_PLACEHOLDER;
    this.input.addEventListener('input', () => this.onInput());
    this.input.addEventListener('keydown', (e) => this.onKeydown(e));
    this.chip.addEventListener('click', () => this.setMode(this.mode === 'service' ? 'project' : 'service'));
    this.root.querySelector('.gs-settings')!.addEventListener('click', () => this.openOptions());
    const clearButton = this.root.querySelector<HTMLButtonElement>('.gs-clear')!;
    clearButton.addEventListener('click', () => void this.clearHistory(clearButton));
    this.refreshButton = this.root.querySelector('.gs-refresh')!;
    this.refreshButton.addEventListener('click', () => void this.refreshProducts());
    this.root.addEventListener('mousedown', (e) => {
      // 바깥(배경) 클릭 시 닫기. 그 외 클릭은 입력창 포커스를 유지한다.
      if (e.target === this.root) this.opts.onClose();
      else if (e.target !== this.input) e.preventDefault();
    });

    container.append(style, this.root);
    this.renderFavorites();
    this.updateChip();
    this.refresh();
    this.input.focus();
  }

  private onInput(): void {
    if (this.mode === 'service') this.commitTypedProjects();
    this.refresh();
  }

  private onKeydown(e: KeyboardEvent): void {
    // 한글 조합 중 Enter/Tab은 IME가 처리하도록 둔다.
    if (e.isComposing || e.keyCode === 229) return;
    // 설정한 키(기본 Ctrl)+숫자: 자주 찾은 서비스 바로 열기 (한글 자판, Option 조합이어도 e.code는 같다)
    const digit = /^Digit([1-9])$/.exec(e.code);
    const modifierHeld =
      (this.favoriteModifier === 'ctrl' && e.ctrlKey && !e.altKey) || (this.favoriteModifier === 'alt' && e.altKey && !e.ctrlKey);
    if (digit && modifierHeld && !e.metaKey) {
      const entry = this.favorites()[Number(digit[1]) - 1];
      if (entry) {
        e.preventDefault();
        void this.activate({ kind: 'entry', entry }, e.shiftKey);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.select(this.selected + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.select(this.selected - 1);
        break;
      case 'Enter': {
        e.preventDefault();
        const item = this.items[this.selected];
        if (item) void this.activate(item, e.metaKey || e.ctrlKey);
        break;
      }
      case 'Tab': {
        e.preventDefault();
        const item = this.items[this.selected];
        // @입력 중이면 Tab은 자동완성, 아니면 프로젝트 모드 전환
        if (this.mode === 'service' && this.activeAtToken() && item) {
          // 자동완성은 이어서 서비스를 입력하려는 것이므로 페이지를 바꾸지 않는다.
          if (item.kind === 'project') this.pickProject(item.project, { stay: true });
          else void this.activate(item, false);
        }
        else this.setMode(this.mode === 'service' ? 'project' : 'service');
        break;
      }
      case 'Escape':
        e.preventDefault();
        if (this.mode === 'project') this.setMode('service');
        else this.opts.onClose();
        break;
    }
  }

  private setMode(mode: Mode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    if (mode === 'project') {
      this.savedQuery = this.input.value;
      this.input.value = '';
      this.input.placeholder = PROJECT_PLACEHOLDER;
    } else {
      this.input.value = this.savedQuery;
      this.input.placeholder = SERVICE_PLACEHOLDER;
    }
    this.chip.classList.toggle('gs-chip-active', mode === 'project');
    this.favs.hidden = mode === 'project' || this.favs.childElementCount === 0;
    this.refresh();
    this.input.focus();
  }

  private activeAtToken(): { start: number; end: number; term: string } | undefined {
    const caret = this.input.selectionStart ?? this.input.value.length;
    const m = ACTIVE_AT_RE.exec(this.input.value.slice(0, caret));
    if (!m) return undefined;
    return { start: m.index + m[1].length, end: caret, term: m[2] };
  }

  /** "@prod " 처럼 공백까지 입력된 @토큰을 프로젝트로 확정하고 입력창에서 지운다. */
  private commitTypedProjects(): void {
    let matched: Project | undefined;
    const replace = (s: string) =>
      s.replace(DONE_AT_RE, (whole, pre: string, term: string) => {
        const p = searchProjects(term, this.projects)[0];
        if (!p) return whole;
        matched = p;
        return pre;
      });
    const caret = this.input.selectionStart ?? this.input.value.length;
    const before = replace(this.input.value.slice(0, caret)).replace(/^\s+/, '');
    const after = replace(this.input.value.slice(caret));
    if (!matched) return;
    this.input.value = before + after;
    this.input.setSelectionRange(before.length, before.length);
    this.projectId = matched.id;
    this.updateChip();
  }

  private refresh(): void {
    this.renderFavorites();
    let selected = 0;
    if (this.mode === 'project') {
      this.items = this.projectItems(this.input.value);
      // 검색어가 없으면 현재 프로젝트에 커서를 둔다.
      if (!this.input.value.trim()) {
        selected = Math.max(0, this.items.findIndex((i) => i.kind === 'project' && i.project.id === this.projectId));
      }
    } else {
      const token = this.activeAtToken();
      if (token) {
        this.items = this.projectItems(token.term);
      } else {
        this.items = this.serviceItems();
      }
    }
    this.renderList();
    this.select(selected);
  }

  private serviceQuery(): string {
    return this.input.value.replace(ANY_AT_RE, ' ').trim();
  }

  private serviceItems(): Item[] {
    // 빈 입력이면 최근 사용한 항목이 먼저 나온다 (searchEntries).
    return searchEntries(this.serviceQuery(), this.entries, this.usage, this.projectId)
      .slice(0, MAX_ITEMS)
      .map((entry) => ({ kind: 'entry', entry }));
  }

  private projectItems(query: string): Item[] {
    if (this.projects.length === 0) return [{ kind: 'setup' }];
    return searchProjects(query, this.projects).map((project) => ({ kind: 'project', project }));
  }

  /** 현재 프로젝트에서 열 수 있는 항목 중 많이 연 순서(같으면 최근 순). */
  private favorites(): Entry[] {
    return entriesForProject(this.entries, this.projectId)
      .filter((e) => this.usage[e.id])
      .sort((a, b) => this.usage[b.id].count - this.usage[a.id].count || this.usage[b.id].last - this.usage[a.id].last)
      .slice(0, MAX_FAVORITES);
  }

  private renderFavorites(): void {
    const favorites = this.favorites();
    this.favs.replaceChildren(
      ...favorites.map((entry, i) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'gs-fav';
        const shortcut = this.favoriteModifier === 'none' ? '' : `${modifierLabel(this.favoriteModifier, IS_MAC)}${i + 1}`;
        button.title = `${entry.parent ? `${entry.parent} › ` : ''}${entry.title} · ${this.usage[entry.id].count} opens${shortcut ? ` · ${shortcut}` : ''} (${NEW_TAB_KEY}click: new tab)`;
        if (shortcut) button.append(Object.assign(document.createElement('span'), { className: 'gs-fav-key', textContent: shortcut }));
        button.append(entry.title);
        button.addEventListener('click', (e) => void this.activate({ kind: 'entry', entry }, e.metaKey || e.ctrlKey));
        return button;
      }),
    );
    this.favs.hidden = this.mode === 'project' || favorites.length === 0;
  }

  private async activate(item: Item, newTab: boolean): Promise<void> {
    switch (item.kind) {
      case 'entry': {
        const url = buildConsoleUrl(item.entry.path, this.projectId, this.authuser);
        await Promise.all([recordUsage(item.entry.id), this.projectId ? setLastProject(this.projectId) : undefined]);
        this.opts.onOpen(url, newTab);
        break;
      }
      case 'project':
        this.pickProject(item.project, { newTab });
        break;
      case 'setup':
        this.openOptions();
        break;
    }
  }

  private pickProject(project: Project, { newTab = false, stay = false } = {}): void {
    // 서비스 검색어 없이 프로젝트만 골랐고 지금 콘솔 페이지에 있으면, 같은 페이지를 그 프로젝트로 다시 연다.
    if (!stay && this.switchCurrentPage(project, newTab)) return;
    this.projectId = project.id;
    this.updateChip();
    if (this.mode === 'project') {
      this.setMode('service');
      return;
    }
    const token = this.activeAtToken();
    if (token) {
      const v = this.input.value;
      const before = v.slice(0, token.start);
      this.input.value = before + v.slice(token.end).replace(/^\s+/, '');
      this.input.setSelectionRange(before.length, before.length);
    }
    this.refresh();
  }

  private switchCurrentPage(project: Project, newTab: boolean): boolean {
    const current = this.opts.currentUrl;
    if (!current || !current.startsWith(`${CONSOLE_ORIGIN}/`) || projectFromUrl(current) === project.id) return false;
    const rest = this.mode === 'project' ? this.savedQuery : this.input.value;
    if (rest.replace(ANY_AT_RE, ' ').trim()) return false;
    const url = new URL(current);
    url.searchParams.set('project', project.id);
    void setLastProject(project.id);
    this.opts.onOpen(url.toString(), newTab);
    return true;
  }

  private clearConfirmTimer?: ReturnType<typeof setTimeout>;

  /** 실수로 지우지 않게 두 번 눌러야 지운다. */
  private async clearHistory(button: HTMLButtonElement): Promise<void> {
    if (!button.classList.contains('gs-confirm')) {
      button.classList.add('gs-confirm');
      button.textContent = 'Confirm clear';
      clearTimeout(this.clearConfirmTimer);
      this.clearConfirmTimer = setTimeout(() => {
        button.classList.remove('gs-confirm');
        button.textContent = 'Clear';
      }, 3000);
      this.input.focus();
      return;
    }
    clearTimeout(this.clearConfirmTimer);
    await clearUsage();
    this.usage = {};
    this.renderFavorites();
    this.refresh();
    button.classList.remove('gs-confirm');
    button.textContent = 'Clear';
    this.input.focus();
  }

  /** 콘솔에서 서비스 목록을 다시 가져와 지금 열린 입력창에도 반영한다. 결과는 버튼 글자로 잠깐 보여준다. */
  private async refreshProducts(): Promise<void> {
    const button = this.refreshButton;
    button.disabled = true;
    button.textContent = 'Refreshing…';
    let label = 'Failed';
    try {
      const result = await syncProductsNow(this.authuser);
      if (result.status === 'ok') {
        const data = await loadSearchData();
        this.entries = data.entries;
        this.renderFavorites();
        this.refresh();
        label = `Refreshed (${result.count.toLocaleString()})`;
      } else if (result.status === 'auth') {
        label = 'Sign in first';
      }
    } catch {
      // label은 'Failed' 그대로
    }
    button.textContent = label;
    this.input.focus();
    setTimeout(() => {
      button.textContent = 'Refresh';
      button.disabled = false;
    }, 2500);
  }

  private openOptions(): void {
    this.opts.onOpenOptions();
    this.opts.onClose();
  }

  private updateChip(): void {
    const project = this.projects.find((p) => p.id === this.projectId);
    this.chip.textContent = project?.alias || this.projectId || 'No project';
    this.chip.title = `${this.projectId ?? 'No project selected'} · Switch (Tab)`;
    this.chip.classList.toggle('gs-chip-empty', !this.projectId);
    // 설정한 헤더 색이 있으면 칩도 같은 색으로 칠해 콘솔 상단과 맞춘다.
    const color = project?.color;
    this.chip.style.background = color ?? '';
    this.chip.style.color = color ? (isDarkColor(color) ? '#fff' : '#1f1f1f') : '';
  }

  private renderList(): void {
    this.list.replaceChildren();
    if (this.items.length === 0) {
      const li = document.createElement('li');
      li.className = 'gs-empty';
      // 빈 입력인데 기록이 없으면 안내만 보여준다.
      li.textContent = this.mode === 'service' && !this.serviceQuery() ? 'Type a service name. Services you open will show up here, most used first.' : 'No results';
      this.list.append(li);
      return;
    }
    this.items.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'gs-item';
      li.setAttribute('role', 'option');
      li.append(...this.renderItem(item));
      li.addEventListener('mousemove', () => {
        if (this.selected !== index) this.select(index);
      });
      li.addEventListener('click', (e) => void this.activate(item, e.metaKey || e.ctrlKey));
      this.list.append(li);
    });
  }

  private renderItem(item: Item): Node[] {
    const title = document.createElement('span');
    title.className = 'gs-title';
    const sub = document.createElement('span');
    sub.className = 'gs-sub';

    switch (item.kind) {
      case 'entry': {
        if (item.entry.parent) {
          const parent = document.createElement('span');
          parent.className = 'gs-parent';
          parent.textContent = `${item.entry.parent} › `;
          title.append(parent);
        }
        title.append(item.entry.title);
        sub.textContent = item.entry.path;
        sub.title = item.entry.path;
        if (item.entry.id.startsWith(CUSTOM_ID_PREFIX)) {
          const label = document.createElement('span');
          label.className = 'gs-item-label';
          const badge = document.createElement('span');
          badge.className = 'gs-custom-badge';
          badge.textContent = 'Custom';
          const project = this.projects.find((p) => p.id === (item.entry.projectId ?? this.projectId));
          if (project?.color) {
            badge.style.setProperty('--gs-custom-color', project.color);
            badge.classList.add('gs-custom-badge-colored');
          }
          label.append(badge, title);
          return [label, sub];
        }
        break;
      }
      case 'project': {
        const { project } = item;
        title.textContent = project.alias || project.id;
        if (project.color) {
          const dot = document.createElement('span');
          dot.className = 'gs-project-color';
          dot.style.backgroundColor = project.color;
          dot.setAttribute('aria-hidden', 'true');
          const label = document.createElement('span');
          label.className = 'gs-item-label';
          label.append(dot, title);
          sub.textContent = project.id === this.projectId ? `${project.id} · current` : project.id;
          return [label, sub];
        }
        sub.textContent = project.id === this.projectId ? `${project.id} · current` : project.id;
        break;
      }
      case 'setup':
        title.textContent = 'No projects registered';
        sub.textContent = 'Add projects in Settings';
        break;
    }
    return [title, sub];
  }

  private select(index: number): void {
    if (this.items.length === 0) return;
    this.selected = (index + this.items.length) % this.items.length;
    const lis = this.list.querySelectorAll<HTMLLIElement>('.gs-item');
    lis.forEach((li, i) => {
      const on = i === this.selected;
      li.classList.toggle('gs-selected', on);
      li.setAttribute('aria-selected', String(on));
    });
    lis[this.selected]?.scrollIntoView({ block: 'nearest' });
  }
}
