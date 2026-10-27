import { CONSOLE_ORIGIN, type Entry } from './catalog';
import { syncProductsNow } from './messages';
import { CUSTOM_ID_PREFIX, loadEntrySource } from './products';
import {
  getCustomEntries,
  getHiddenEntries,
  getProjects,
  getSettings,
  IS_MAC,
  modifierLabel,
  setSettings,
  setCustomEntries,
  setHiddenEntries,
  setProjects,
  type CustomEntry,
  type FavoriteModifier,
  type Project,
} from './storage';

const rows = document.getElementById('project-rows') as HTMLTableSectionElement;
const newAlias = document.getElementById('new-alias') as HTMLInputElement;
const newId = document.getElementById('new-id') as HTMLInputElement;
const errorEl = document.getElementById('error') as HTMLParagraphElement;
const toast = document.getElementById('toast') as HTMLDivElement;

let projects: Project[] = [];
let toastTimer: number | undefined;

function showSaved(): void {
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1200);
}

/** 문제가 있으면 오류 메시지, 없으면 undefined */
function validate(list: Project[]): string | undefined {
  const ids = new Set<string>();
  const aliases = new Set<string>();
  for (const p of list) {
    if (!p.id) return 'Enter a project ID.';
    if (/\s/.test(p.id)) return `Project ID contains spaces: "${p.id}"`;
    if (ids.has(p.id)) return `Project ID already registered: ${p.id}`;
    ids.add(p.id);
    if (p.alias) {
      if (/\s/.test(p.alias)) return `Alias cannot contain spaces: "${p.alias}"`;
      if (aliases.has(p.alias)) return `Alias already in use: ${p.alias}`;
      aliases.add(p.alias);
    }
  }
  return undefined;
}

async function save(next: Project[]): Promise<boolean> {
  const error = validate(next);
  errorEl.textContent = error ?? '';
  if (error) return false;
  projects = next;
  await setProjects(projects);
  showSaved();
  return true;
}

function readProject(alias: string, id: string, color?: string): Project {
  const a = alias.trim();
  return { id: id.trim(), ...(a ? { alias: a } : {}), ...(color ? { color } : {}) };
}

/** 헤더 색 프리셋. 윗줄은 진한 색(prod처럼 눈에 띄어야 할 때), 아랫줄은 연한 색. */
const PRESET_COLORS: { color: string; name: string }[] = [
  { color: '#d93025', name: 'Red' },
  { color: '#e8710a', name: 'Orange' },
  { color: '#f9ab00', name: 'Yellow' },
  { color: '#1e8e3e', name: 'Green' },
  { color: '#1a73e8', name: 'Blue' },
  { color: '#9334e6', name: 'Purple' },
  { color: '#fad2cf', name: 'Light red' },
  { color: '#fedfc8', name: 'Light orange' },
  { color: '#feefc3', name: 'Light yellow' },
  { color: '#ceead6', name: 'Light green' },
  { color: '#d2e3fc', name: 'Light blue' },
  { color: '#e9d2fd', name: 'Light purple' },
];

/** 색 견본 버튼 + 프리셋 팝오버(직접 선택, 기본색 포함). 색을 안 고른 상태는 undefined. */
interface ColorField {
  el: HTMLElement;
  value(): string | undefined;
  set(color: string | undefined): void;
}

let openPopover: HTMLElement | undefined;
document.addEventListener('mousedown', (e) => {
  if (openPopover && !openPopover.parentElement!.contains(e.target as Node)) closePopover();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePopover();
});
function closePopover(): void {
  openPopover?.setAttribute('hidden', '');
  openPopover = undefined;
}

function colorField(initial: string | undefined, onChange: (color: string | undefined) => void): ColorField {
  let current = initial;
  const wrap = document.createElement('div');
  wrap.className = 'color-field';
  const swatch = Object.assign(document.createElement('button'), { type: 'button', className: 'swatch', title: 'Pick header color' });
  const popover = document.createElement('div');
  popover.className = 'color-popover';
  popover.hidden = true;

  const choose = (color: string | undefined) => {
    current = color;
    sync();
    closePopover();
    onChange(current);
  };

  const grid = document.createElement('div');
  grid.className = 'preset-grid';
  const presetButtons = PRESET_COLORS.map(({ color, name }) => {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'preset', title: `${name} ${color}` });
    b.style.background = color;
    b.addEventListener('click', () => choose(color));
    grid.append(b);
    return { b, color };
  });

  const actions = document.createElement('div');
  actions.className = 'popover-actions';
  const custom = Object.assign(document.createElement('label'), { className: 'custom', textContent: 'Custom…' });
  const picker = Object.assign(document.createElement('input'), { type: 'color' });
  picker.addEventListener('change', () => choose(picker.value));
  custom.append(picker);
  const reset = Object.assign(document.createElement('button'), { type: 'button', className: 'color-reset', textContent: 'Default' });
  reset.addEventListener('click', () => choose(undefined));
  actions.append(custom, reset);
  popover.append(grid, actions);

  swatch.addEventListener('click', () => {
    const wasOpen = openPopover === popover;
    closePopover();
    if (!wasOpen) {
      popover.hidden = false;
      openPopover = popover;
    }
  });

  const sync = () => {
    wrap.classList.toggle('unset', !current);
    swatch.style.background = current ?? '';
    swatch.title = current ? `Header color ${current} · change` : 'Console default · pick header color';
    picker.value = current ?? '#1a73e8';
    reset.disabled = !current;
    for (const { b, color } of presetButtons) b.classList.toggle('selected', color === current);
  };
  wrap.append(swatch, popover);
  sync();
  return {
    el: wrap,
    value: () => current,
    set: (color) => {
      current = color;
      sync();
    },
  };
}

function render(): void {
  rows.replaceChildren(
    ...projects.map((project, index) => {
      let p = project;
      const tr = document.createElement('tr');
      const aliasInput = Object.assign(document.createElement('input'), { value: p.alias ?? '' });
      const idInput = Object.assign(document.createElement('input'), { value: p.id });
      const del = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Delete', className: 'delete' });
      const color = colorField(p.color, () => void onChange());

      const onChange = async () => {
        const next = projects.slice();
        next[index] = readProject(aliasInput.value, idInput.value, color.value());
        // 잘못된 값이면 저장하지 않고 원래 값으로 되돌린다.
        if (!(await save(next))) {
          aliasInput.value = p.alias ?? '';
          idInput.value = p.id;
          color.set(p.color);
        } else {
          p = next[index];
        }
      };
      aliasInput.addEventListener('change', onChange);
      idInput.addEventListener('change', onChange);
      del.addEventListener('click', async () => {
        await save(projects.filter((_, i) => i !== index));
        render();
      });

      const handle = Object.assign(document.createElement('span'), { className: 'drag-handle', textContent: '⠿', title: 'Drag to reorder' });
      enableDrag(tr, handle, index);

      for (const child of [handle, aliasInput, idInput, color.el, del]) {
        const td = document.createElement('td');
        td.append(child);
        tr.append(td);
      }
      return tr;
    }),
  );
}

// ---- 끌어서 순서 바꾸기 ----
// 입력칸을 드래그로 잡지 않도록, 손잡이를 누른 동안에만 행을 draggable로 만든다.

let dragFrom: number | undefined;

function clearDropMarks(): void {
  for (const tr of rows.querySelectorAll('tr')) tr.classList.remove('drop-before', 'drop-after');
}

function enableDrag(tr: HTMLTableRowElement, handle: HTMLElement, index: number): void {
  handle.addEventListener('mousedown', () => (tr.draggable = true));
  handle.addEventListener('mouseup', () => (tr.draggable = false));
  tr.addEventListener('dragstart', (e) => {
    dragFrom = index;
    tr.classList.add('dragging');
    e.dataTransfer!.effectAllowed = 'move';
    e.dataTransfer!.setData('text/plain', String(index));
  });
  tr.addEventListener('dragend', () => {
    tr.draggable = false;
    tr.classList.remove('dragging');
    clearDropMarks();
    dragFrom = undefined;
  });
  tr.addEventListener('dragover', (e) => {
    if (dragFrom === undefined) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    const r = tr.getBoundingClientRect();
    const before = e.clientY < r.top + r.height / 2;
    clearDropMarks();
    tr.classList.add(before ? 'drop-before' : 'drop-after');
  });
  tr.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (dragFrom === undefined) return;
    const r = tr.getBoundingClientRect();
    const before = e.clientY < r.top + r.height / 2;
    // 빼낸 뒤의 목록 기준으로 넣을 위치를 다시 계산한다.
    let to = before ? index : index + 1;
    if (dragFrom < to) to--;
    const from = dragFrom;
    clearDropMarks();
    if (from === to) return;
    const next = projects.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    if (await save(next)) render();
  });
}

const newColor = colorField(undefined, () => {});
document.getElementById('new-color-cell')!.append(newColor.el);

async function add(): Promise<void> {
  if (await save([...projects, readProject(newAlias.value, newId.value, newColor.value())])) {
    newAlias.value = '';
    newId.value = '';
    newColor.set(undefined);
    render();
    newAlias.focus();
  }
}

document.getElementById('add')!.addEventListener('click', () => void add());
for (const input of [newAlias, newId]) {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) void add();
  });
}

async function initShortcut(): Promise<void> {
  const commands = await chrome.commands.getAll();
  const shortcut = commands.find((c) => c.name === 'open-spotlight')?.shortcut;
  document.getElementById('shortcut')!.textContent = shortcut || 'Not set';
  document.getElementById('change-shortcut')!.addEventListener('click', () => {
    void chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });
}

async function initFavoriteModifier(): Promise<void> {
  const select = document.getElementById('favorite-modifier') as HTMLSelectElement;
  const hint = document.getElementById('favorite-modifier-hint')!;
  const showHint = () => {
    const m = select.value as FavoriteModifier;
    hint.textContent = m === 'none' ? 'Shortcuts off (click the chips instead)' : `${modifierLabel(m, IS_MAC)}1 – ${modifierLabel(m, IS_MAC)}6`;
  };
  const settings = await getSettings();
  select.value = settings.favoriteModifier;
  showHint();
  select.addEventListener('change', async () => {
    await setSettings({ ...settings, favoriteModifier: select.value as FavoriteModifier });
    showHint();
    showSaved();
  });
}

// ---- 서비스 목록 ----

const syncStatus = document.getElementById('sync-status') as HTMLSpanElement;
const syncButton = document.getElementById('sync-now') as HTMLButtonElement;
const entryFilter = document.getElementById('entry-filter') as HTMLInputElement;
const hiddenOnly = document.getElementById('hidden-only') as HTMLInputElement;
const entryList = document.getElementById('entry-list') as HTMLUListElement;
const entryCount = document.getElementById('entry-count') as HTMLParagraphElement;

let entries: Entry[] = [];
let hidden = new Set<string>();

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

async function loadEntries(): Promise<void> {
  const source = await loadEntrySource();
  entries = source.all;
  syncStatus.textContent =
    source.origin === 'console' && source.fetchedAt
      ? `${entries.length.toLocaleString()} items from the console · ${formatTime(source.fetchedAt)}`
      : `Not fetched yet · using the built-in list (${entries.length} items)`;
  renderEntries();
}

function renderEntries(): void {
  const q = entryFilter.value.trim().toLowerCase();
  const shown = entries.filter((e) => {
    if (hiddenOnly.checked && !hidden.has(e.id)) return false;
    return !q || [e.title, e.parent ?? '', e.path].some((f) => f.toLowerCase().includes(q));
  });
  entryList.replaceChildren(
    ...shown.map((e) => {
      const li = document.createElement('li');
      li.classList.toggle('off', hidden.has(e.id));
      const label = document.createElement('label');
      const box = Object.assign(document.createElement('input'), { type: 'checkbox', checked: !hidden.has(e.id) });
      box.addEventListener('change', async () => {
        if (box.checked) hidden.delete(e.id);
        else hidden.add(e.id);
        li.classList.toggle('off', !box.checked);
        await setHiddenEntries([...hidden]);
        renderCount();
        showSaved();
      });
      const title = document.createElement('span');
      title.className = 'title';
      if (e.parent) {
        const parent = Object.assign(document.createElement('span'), { className: 'parent', textContent: `${e.parent} › ` });
        title.append(parent);
      }
      title.append(e.title);
      const path = Object.assign(document.createElement('span'), { className: 'path', textContent: e.path, title: e.path });
      label.append(box, title, path);
      li.append(label);
      return li;
    }),
  );
  renderCount(shown.length);
}

function renderCount(shownCount?: number): void {
  const hiddenCount = entries.filter((e) => hidden.has(e.id)).length;
  const shownText = shownCount !== undefined && shownCount !== entries.length ? `Showing ${shownCount.toLocaleString()} · ` : '';
  entryCount.textContent = `${shownText}${hiddenCount} of ${entries.length.toLocaleString()} hidden`;
}

syncButton.addEventListener('click', async () => {
  syncButton.disabled = true;
  syncStatus.textContent = 'Fetching…';
  try {
    const result = await syncProductsNow();
    if (result.status === 'ok') {
      await loadEntries();
      showSaved();
    } else if (result.status === 'auth') {
      syncStatus.textContent = 'Google sign-in required. Sign in to the console and try again.';
    } else {
      syncStatus.textContent = `Fetch failed: ${result.message}`;
    }
  } finally {
    syncButton.disabled = false;
  }
});
entryFilter.addEventListener('input', renderEntries);
hiddenOnly.addEventListener('change', renderEntries);

// ---- 직접 등록 ----

const customRows = document.getElementById('custom-rows') as HTMLTableSectionElement;
const newCustomTitle = document.getElementById('new-custom-title') as HTMLInputElement;
const newCustomPath = document.getElementById('new-custom-path') as HTMLInputElement;
const customError = document.getElementById('custom-error') as HTMLParagraphElement;

let custom: CustomEntry[] = [];

/** 콘솔 주소나 경로를 "/경로?쿼리" 형태로 바꾼다. project, authuser는 열 때 붙이므로 뺀다. */
function normalizePath(input: string): string | undefined {
  const value = input.trim();
  if (!value) return undefined;
  let url: URL;
  try {
    url = new URL(value, CONSOLE_ORIGIN);
  } catch {
    return undefined;
  }
  if (url.origin !== CONSOLE_ORIGIN) return undefined;
  url.searchParams.delete('project');
  url.searchParams.delete('authuser');
  return url.pathname + url.search + url.hash;
}

function renderCustom(): void {
  customRows.replaceChildren(
    ...custom.map((c) => {
      const tr = document.createElement('tr');
      const title = Object.assign(document.createElement('td'), { textContent: c.title });
      const path = Object.assign(document.createElement('td'), { textContent: c.path });
      const del = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Delete', className: 'delete' });
      del.addEventListener('click', async () => {
        custom = custom.filter((x) => x.id !== c.id);
        await setCustomEntries(custom);
        renderCustom();
        showSaved();
      });
      const delCell = document.createElement('td');
      delCell.append(del);
      tr.append(title, path, delCell);
      return tr;
    }),
  );
}

async function addCustom(): Promise<void> {
  const title = newCustomTitle.value.trim();
  const path = normalizePath(newCustomPath.value);
  if (!title) customError.textContent = 'Enter a name.';
  else if (!path) customError.textContent = 'Enter a console path (starting with /) or a console.cloud.google.com URL.';
  else if (custom.some((c) => c.path === path)) customError.textContent = `Path already registered: ${path}`;
  else {
    customError.textContent = '';
    custom = [...custom, { id: `${CUSTOM_ID_PREFIX}${Date.now()}`, title, path }];
    await setCustomEntries(custom);
    newCustomTitle.value = '';
    newCustomPath.value = '';
    renderCustom();
    showSaved();
    newCustomTitle.focus();
  }
}

document.getElementById('add-custom')!.addEventListener('click', () => void addCustom());
for (const input of [newCustomTitle, newCustomPath]) {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) void addCustom();
  });
}

void (async () => {
  [projects, hidden, custom] = await Promise.all([getProjects(), getHiddenEntries().then((h) => new Set(h)), getCustomEntries()]);
  render();
  renderCustom();
  await Promise.all([initShortcut(), initFavoriteModifier(), loadEntries()]);
})();
