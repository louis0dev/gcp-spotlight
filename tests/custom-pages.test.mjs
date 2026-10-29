import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

// Load the pure TypeScript helpers without introducing a browser or a test framework.
async function loadModule(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { normalizeCustomPath, buildConsoleUrl } = await loadModule('../src/catalog.ts');
const { searchEntries, entriesForProject } = await loadModule('../src/search.ts');

test('external product URLs retain project, account, query and fragment on open', () => {
  for (const url of [
    'https://xxx-dot-asia-northeast3.composer.googleusercontent.com/home',
    'https://cluster-dot-region.dataproc.googleusercontent.com/gateway/cluster/yarn/cluster?project=original&authuser=2&view=apps#running',
    'http://yarn.internal:8088/cluster',
  ]) {
    assert.equal(normalizeCustomPath(` ${url} `), url);
    assert.equal(buildConsoleUrl(normalizeCustomPath(url), 'dev-project', '3'), url);
  }
});

test('console paths use the selected project and account', () => {
  const path = normalizeCustomPath('https://console.cloud.google.com/composer/environments?project=old&authuser=2&region=asia-northeast3#details');
  assert.equal(path, '/composer/environments?region=asia-northeast3#details');
  const url = new URL(buildConsoleUrl(path, 'dev-project', '3'));
  assert.equal(url.searchParams.get('project'), 'dev-project');
  assert.equal(url.searchParams.get('authuser'), '3');
  assert.equal(url.searchParams.get('region'), 'asia-northeast3');
  assert.equal(url.hash, '#details');
  assert.equal(normalizeCustomPath('/monitoring?project=old'), '/monitoring');
});

test('reject invalid or executable addresses', () => {
  for (const input of ['', 'javascript:alert(1)', 'data:text/html,test', 'ftp://example.com', 'https://', 'https://user:pass@example.com', 'airflow.example.com']) {
    assert.equal(normalizeCustomPath(input), undefined, input);
  }
});

test('project scope applies to searches, history, and favorites, while keeping shared entries', () => {
  const entries = [
    { id: 'dev', projectId: 'dev-project' },
    { id: 'prod', projectId: 'prod-project' },
    { id: 'builtin' },
    { id: 'legacy' },
  ].map((entry) => ({ ...entry, title: 'Airflow', path: '/composer', ownFields: ['Airflow'], parentFields: [] }));
  const usage = Object.fromEntries(entries.map(({ id }, i) => [id, { count: i + 1, last: i }]));
  for (const query of ['Airflow', '']) {
    assert.deepEqual(new Set(searchEntries(query, entries, usage, 'dev-project').map((e) => e.id)), new Set(['dev', 'builtin', 'legacy']));
    assert.deepEqual(new Set(searchEntries(query, entries, usage, 'prod-project').map((e) => e.id)), new Set(['prod', 'builtin', 'legacy']));
    assert.deepEqual(new Set(searchEntries(query, entries, usage).map((e) => e.id)), new Set(['builtin', 'legacy']));
  }
  assert.deepEqual(entriesForProject(entries, 'dev-project').map((e) => e.id), ['dev', 'builtin', 'legacy']);
});

test('matching custom pages rank above console results regardless of usage or match strength', () => {
  const entry = (id, title, projectId) => ({ id, title, projectId, path: '/composer', ownFields: [title], parentFields: [] });
  const entries = [
    entry('console:airflow', 'Airflow'),
    entry('custom:dev', 'Dev Airflow UI', 'dev-project'),
    entry('custom:prod', 'Airflow', 'prod-project'),
    entry('custom:unrelated', 'YARN', 'dev-project'),
    entry('custom:legacy', 'My Airflow'),
  ];
  const usage = { 'console:airflow': { count: 100, last: 100 } };
  assert.deepEqual(searchEntries('airflow', entries, usage, 'dev-project').map((e) => e.id), [
    'custom:dev', 'custom:legacy', 'console:airflow',
  ]);
  // Empty input continues to show usage history rather than unused custom pages.
  assert.deepEqual(searchEntries('', entries, usage, 'dev-project').map((e) => e.id), ['console:airflow']);
});

const { customHeaderOrigins, customProjectFromUrl } = await loadModule('../src/custom-headers.ts');

test('custom header permissions are limited to saved external sites', () => {
  const entries = [
    { path: 'https://airflow.example.com/home', projectId: 'dev' },
    { path: 'https://airflow.example.com/dags', projectId: 'dev' },
    { path: 'http://yarn.internal:8088/cluster', projectId: 'dev' },
    { path: '/composer', projectId: 'dev' },
    { path: 'https://console.cloud.google.com/composer', projectId: 'dev' },
    { path: 'https://legacy.example.com/home' },
  ];
  assert.deepEqual(customHeaderOrigins(entries), ['http://yarn.internal/*', 'https://airflow.example.com/*']);
});

test('custom header follows product navigation and avoids ambiguous project colors', () => {
  const entries = [{ path: 'https://airflow.example.com/home', projectId: 'dev' }];
  assert.equal(customProjectFromUrl('https://airflow.example.com/dags?view=grid', entries), 'dev');
  assert.equal(customProjectFromUrl('https://unrelated.example.com/home', entries), undefined);
  const shared = [
    { path: 'https://shared.example.com/dev', projectId: 'dev' },
    { path: 'https://shared.example.com/prod', projectId: 'prod' },
  ];
  assert.equal(customProjectFromUrl('https://shared.example.com/prod/jobs', shared), 'prod');
  assert.equal(customProjectFromUrl('https://shared.example.com/production', shared), undefined);
  assert.equal(customProjectFromUrl('https://shared.example.com/', shared), undefined);
  assert.equal(customProjectFromUrl('https://shared.example.com/dev', [...shared, { path: 'https://shared.example.com/dev', projectId: 'prod' }]), undefined);
});

test('custom pages receive a non-interactive top strip that updates with settings', async () => {
  const { runInNewContext } = await import('node:vm');
  const source = await readFile(new URL('../src/header.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  const nodes = new Map();
  const listeners = [];
  let requests = 0;
  const append = (node) => nodes.set(node.id, node);
  const document = {
    documentElement: { append }, head: { append },
    getElementById: (id) => nodes.get(id),
    createElement: () => {
      const node = { style: {}, setAttribute() {}, remove() { nodes.delete(node.id); } };
      return node;
    },
  };
  const dependencies = {
    './catalog': { CONSOLE_ORIGIN: 'https://console.cloud.google.com' },
    './custom-headers': { customProjectFromUrl },
    './color': {},
    './storage': {
      getProjects: async () => [{ id: 'dev', color: '#d93025' }],
      getCustomEntries: async () => [{ path: 'https://airflow.example.com/home', projectId: 'dev' }],
    },
  };
  runInNewContext(outputText, {
    exports: {}, require: (name) => dependencies[name], document,
    location: new URL('https://airflow.example.com/dags'), setInterval() {},
    chrome: {
      storage: { onChanged: { addListener: (listener) => listeners.push(listener) } },
      runtime: { sendMessage: () => { requests++; return Promise.resolve(); } },
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  const stripeId = 'gcp-spotlight-project-stripe';
  assert.match(nodes.get(stripeId).style.cssText, /height: 5px/);
  assert.match(nodes.get(stripeId).style.cssText, /pointer-events: none/);
  assert.match(nodes.get(stripeId).style.cssText, /#d93025/);
  assert.equal(requests, 0, 'external sites must not trigger console catalog fetches');
  listeners[0]({ projects: { newValue: [{ id: 'dev', color: '#1a73e8' }] } }, 'sync');
  assert.match(nodes.get(stripeId).style.cssText, /#1a73e8/);
  listeners[0]({ customEntries: { newValue: [] } }, 'sync');
  assert.equal(nodes.has(stripeId), false);
});
