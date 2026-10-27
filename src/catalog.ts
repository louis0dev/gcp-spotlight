export const CONSOLE_ORIGIN = 'https://console.cloud.google.com';

interface PageDef {
  id: string;
  name: string;
  path: string;
  keywords?: string[];
}

interface ServiceDef {
  id: string;
  name: string;
  path: string;
  keywords: string[];
  pages?: PageDef[];
}

export interface Entry {
  id: string;
  kind: 'service' | 'page';
  title: string;
  /** 세부 페이지일 때 소속 서비스 이름 */
  parent?: string;
  path: string;
  /** 이 항목 자체의 검색어 */
  ownFields: string[];
  /** 소속 서비스의 검색어 (세부 페이지만) */
  parentFields: string[];
  /** 콘솔이 붙여 둔 연관 키워드. 이름보다 약하게 친다. */
  keywordFields?: string[];
}

const SERVICES: ServiceDef[] = [
  { id: 'home', name: 'Dashboard', path: '/home/dashboard', keywords: ['home', '홈', '대시보드'] },
  {
    id: 'bigquery',
    name: 'BigQuery',
    path: '/bigquery',
    keywords: ['bq', 'bigquery', '빅쿼리'],
    pages: [
      { id: 'scheduled-queries', name: 'Scheduled queries', path: '/bigquery/scheduled-queries', keywords: ['schedule', '예약'] },
      { id: 'transfers', name: 'Data transfers', path: '/bigquery/transfers', keywords: ['dts', 'transfer'] },
      { id: 'dataform', name: 'Dataform', path: '/bigquery/dataform', keywords: ['dataform'] },
    ],
  },
  {
    id: 'storage',
    name: 'Cloud Storage',
    path: '/storage/browser',
    keywords: ['gcs', 'storage', 'bucket', '버킷', '스토리지'],
    pages: [{ id: 'settings', name: 'Settings', path: '/storage/settings' }],
  },
  {
    id: 'compute',
    name: 'Compute Engine',
    path: '/compute/instances',
    keywords: ['gce', 'vm', 'compute', 'instance'],
    pages: [
      { id: 'instances', name: 'VM instances', path: '/compute/instances', keywords: ['vm'] },
      { id: 'templates', name: 'Instance templates', path: '/compute/instanceTemplates' },
      { id: 'groups', name: 'Instance groups', path: '/compute/instanceGroups/list', keywords: ['mig'] },
      { id: 'disks', name: 'Disks', path: '/compute/disks' },
      { id: 'snapshots', name: 'Snapshots', path: '/compute/snapshots' },
      { id: 'images', name: 'Images', path: '/compute/images' },
    ],
  },
  {
    id: 'vpc',
    name: 'VPC network',
    path: '/networking/networks/list',
    keywords: ['vpc', 'network', 'networking', '네트워크'],
    pages: [
      { id: 'firewall', name: 'Firewall', path: '/networking/firewalls/list', keywords: ['fw', '방화벽'] },
      { id: 'addresses', name: 'IP addresses', path: '/networking/addresses/list', keywords: ['ip', 'static ip'] },
      { id: 'routes', name: 'Routes', path: '/networking/routes/list' },
    ],
  },
  { id: 'lb', name: 'Load balancing', path: '/net-services/loadbalancing/list/loadBalancers', keywords: ['lb', 'load balancer'] },
  { id: 'dns', name: 'Cloud DNS', path: '/net-services/dns/zones', keywords: ['dns'] },
  { id: 'nat', name: 'Cloud NAT', path: '/net-services/nat/list', keywords: ['nat'] },
  { id: 'armor', name: 'Cloud Armor', path: '/net-security/securitypolicies/list', keywords: ['armor', 'waf'] },
  {
    id: 'gke',
    name: 'Kubernetes Engine',
    path: '/kubernetes/list/overview',
    keywords: ['gke', 'k8s', 'kubernetes', 'cluster', '쿠버네티스'],
    pages: [
      { id: 'clusters', name: 'Clusters', path: '/kubernetes/list/overview' },
      { id: 'workloads', name: 'Workloads', path: '/kubernetes/workload/overview', keywords: ['pod', 'deployment'] },
      { id: 'discovery', name: 'Services & Ingress', path: '/kubernetes/discovery', keywords: ['ingress', 'service'] },
      { id: 'config', name: 'Secrets & ConfigMaps', path: '/kubernetes/config', keywords: ['configmap'] },
    ],
  },
  {
    id: 'run',
    name: 'Cloud Run',
    path: '/run',
    keywords: ['run', 'cloudrun', 'serverless'],
    pages: [{ id: 'jobs', name: 'Jobs', path: '/run/jobs' }],
  },
  { id: 'functions', name: 'Cloud Functions', path: '/functions/list', keywords: ['gcf', 'functions', 'function', 'serverless'] },
  { id: 'appengine', name: 'App Engine', path: '/appengine', keywords: ['gae', 'appengine'] },
  { id: 'sql', name: 'Cloud SQL', path: '/sql/instances', keywords: ['sql', 'mysql', 'postgres', 'postgresql', 'db', 'database'] },
  { id: 'spanner', name: 'Spanner', path: '/spanner/instances', keywords: ['spanner', 'db'] },
  { id: 'firestore', name: 'Firestore', path: '/firestore/databases', keywords: ['firestore', 'datastore', 'nosql'] },
  { id: 'bigtable', name: 'Bigtable', path: '/bigtable/instances', keywords: ['bigtable', 'bt'] },
  { id: 'memorystore', name: 'Memorystore for Redis', path: '/memorystore/redis/instances', keywords: ['redis', 'memorystore', 'cache'] },
  {
    id: 'pubsub',
    name: 'Pub/Sub',
    path: '/cloudpubsub/topic/list',
    keywords: ['pubsub', 'ps', 'topic', 'queue'],
    pages: [
      { id: 'topics', name: 'Topics', path: '/cloudpubsub/topic/list', keywords: ['topic'] },
      { id: 'subscriptions', name: 'Subscriptions', path: '/cloudpubsub/subscription/list', keywords: ['sub', 'subscription'] },
    ],
  },
  { id: 'dataflow', name: 'Dataflow', path: '/dataflow/jobs', keywords: ['dataflow', 'beam', 'df'] },
  { id: 'dataproc', name: 'Dataproc', path: '/dataproc/clusters', keywords: ['dataproc', 'spark', 'hadoop'] },
  { id: 'composer', name: 'Composer', path: '/composer/environments', keywords: ['composer', 'airflow'] },
  { id: 'datastream', name: 'Datastream', path: '/datastream/streams', keywords: ['datastream', 'cdc'] },
  {
    id: 'vertex',
    name: 'Vertex AI',
    path: '/vertex-ai',
    keywords: ['vertex', 'ai', 'ml'],
    pages: [
      { id: 'workbench', name: 'Workbench', path: '/vertex-ai/workbench/instances', keywords: ['notebook', 'jupyter'] },
      { id: 'pipelines', name: 'Pipelines', path: '/vertex-ai/pipelines' },
      { id: 'models', name: 'Model Registry', path: '/vertex-ai/models', keywords: ['model'] },
    ],
  },
  {
    id: 'iam',
    name: 'IAM & Admin',
    path: '/iam-admin/iam',
    keywords: ['iam', 'admin', 'permission', '권한'],
    pages: [
      { id: 'iam', name: 'IAM', path: '/iam-admin/iam', keywords: ['권한'] },
      { id: 'service-accounts', name: 'Service accounts', path: '/iam-admin/serviceaccounts', keywords: ['sa', '서비스 계정'] },
      { id: 'roles', name: 'Roles', path: '/iam-admin/roles', keywords: ['role'] },
      { id: 'audit', name: 'Audit logs', path: '/iam-admin/audit', keywords: ['audit'] },
      { id: 'quotas', name: 'Quotas', path: '/iam-admin/quotas', keywords: ['quota', '할당량'] },
      { id: 'wif', name: 'Workload Identity Federation', path: '/iam-admin/workload-identity-pools', keywords: ['wif', 'oidc'] },
      { id: 'settings', name: 'Settings', path: '/iam-admin/settings', keywords: ['project settings', '프로젝트 설정'] },
      { id: 'asset-inventory', name: 'Asset Inventory', path: '/iam-admin/asset-inventory', keywords: ['asset'] },
    ],
  },
  { id: 'resource-manager', name: 'Manage resources', path: '/cloud-resource-manager', keywords: ['resource manager', 'projects', 'folders', '프로젝트'] },
  { id: 'scc', name: 'Security Command Center', path: '/security/command-center', keywords: ['scc', 'security', '보안'] },
  { id: 'secret-manager', name: 'Secret Manager', path: '/security/secret-manager', keywords: ['secret', 'secrets', 'secretmanager', 'sm'] },
  { id: 'kms', name: 'Key Management', path: '/security/kms/keyrings', keywords: ['kms', 'key', 'cloud kms'] },
  {
    id: 'logging',
    name: 'Logging',
    path: '/logs/query',
    keywords: ['log', 'logs', 'logging', '로그'],
    pages: [
      { id: 'explorer', name: 'Logs Explorer', path: '/logs/query', keywords: ['explorer'] },
      { id: 'router', name: 'Log Router', path: '/logs/router', keywords: ['sink', 'router'] },
      { id: 'metrics', name: 'Log-based Metrics', path: '/logs/metrics', keywords: ['metric'] },
      { id: 'storage', name: 'Logs Storage', path: '/logs/storage', keywords: ['bucket'] },
    ],
  },
  {
    id: 'monitoring',
    name: 'Monitoring',
    path: '/monitoring',
    keywords: ['monitoring', 'metric', '모니터링'],
    pages: [
      { id: 'dashboards', name: 'Dashboards', path: '/monitoring/dashboards', keywords: ['dashboard'] },
      { id: 'alerting', name: 'Alerting', path: '/monitoring/alerting', keywords: ['alert', '알림'] },
      { id: 'metrics-explorer', name: 'Metrics explorer', path: '/monitoring/metrics-explorer', keywords: ['metric'] },
      { id: 'uptime', name: 'Uptime checks', path: '/monitoring/uptime', keywords: ['uptime'] },
    ],
  },
  { id: 'errors', name: 'Error Reporting', path: '/errors', keywords: ['error', 'errors', '에러'] },
  { id: 'trace', name: 'Trace', path: '/traces/list', keywords: ['trace', 'tracing'] },
  { id: 'billing', name: 'Billing', path: '/billing/linkedaccount', keywords: ['billing', 'cost', '빌링', '비용', '결제'] },
  {
    id: 'apis',
    name: 'APIs & Services',
    path: '/apis/dashboard',
    keywords: ['api', 'apis'],
    pages: [
      { id: 'library', name: 'Library', path: '/apis/library', keywords: ['enable'] },
      { id: 'credentials', name: 'Credentials', path: '/apis/credentials', keywords: ['api key', 'oauth client'] },
      { id: 'consent', name: 'OAuth consent screen', path: '/apis/credentials/consent', keywords: ['oauth'] },
    ],
  },
  {
    id: 'cloud-build',
    name: 'Cloud Build',
    path: '/cloud-build/builds',
    keywords: ['build', 'ci', 'gcb'],
    pages: [{ id: 'triggers', name: 'Triggers', path: '/cloud-build/triggers', keywords: ['trigger'] }],
  },
  { id: 'artifacts', name: 'Artifact Registry', path: '/artifacts', keywords: ['artifact', 'gar', 'docker', 'registry', 'image'] },
  { id: 'scheduler', name: 'Cloud Scheduler', path: '/cloudscheduler', keywords: ['scheduler', 'cron'] },
  { id: 'tasks', name: 'Cloud Tasks', path: '/cloudtasks', keywords: ['tasks', 'queue'] },
  { id: 'workflows', name: 'Workflows', path: '/workflows', keywords: ['workflow'] },
  { id: 'eventarc', name: 'Eventarc', path: '/eventarc/triggers', keywords: ['eventarc', 'event'] },
  { id: 'marketplace', name: 'Marketplace', path: '/marketplace', keywords: ['marketplace'] },
  { id: 'support', name: 'Support', path: '/support', keywords: ['support', 'case'] },
];

export const ENTRIES: Entry[] = SERVICES.flatMap((s) => {
  const serviceFields = [s.name, ...s.keywords];
  const service: Entry = { id: s.id, kind: 'service', title: s.name, path: s.path, ownFields: serviceFields, parentFields: [] };
  const pages = (s.pages ?? []).map<Entry>((p) => ({
    id: `${s.id}/${p.id}`,
    kind: 'page',
    title: p.name,
    parent: s.name,
    path: p.path,
    ownFields: [p.name, ...(p.keywords ?? [])],
    parentFields: serviceFields,
  }));
  return [service, ...pages];
});

export function buildConsoleUrl(path: string, projectId?: string, authuser = '0'): string {
  const url = new URL(path, CONSOLE_ORIGIN);
  if (projectId) url.searchParams.set('project', projectId);
  // 여러 Google 계정을 쓸 때 지금 보고 있는 계정으로 연다.
  if (authuser !== '0') url.searchParams.set('authuser', authuser);
  return url.toString();
}

function consoleParam(href: string | undefined, name: string): string | undefined {
  if (!href) return undefined;
  try {
    const url = new URL(href);
    if (url.origin !== CONSOLE_ORIGIN) return undefined;
    return url.searchParams.get(name) ?? undefined;
  } catch {
    return undefined;
  }
}

/** 콘솔 페이지 URL이면 ?project= 값을 돌려준다. */
export function projectFromUrl(href: string | undefined): string | undefined {
  return consoleParam(href, 'project');
}

/** 콘솔 페이지 URL의 ?authuser= 값. 없으면 '0' (첫 번째 계정). */
export function authuserFromUrl(href: string | undefined): string {
  return consoleParam(href, 'authuser') ?? '0';
}
