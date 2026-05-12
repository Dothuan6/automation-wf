export type JsonObject = Record<string, any>;

type MockUser = { id: string; fullName: string; role: 'admin' | 'manager' | 'member' | 'viewer' };
type MockCollection = {
  id: string;
  name: string;
  slug: string;
  displayGroup: string;
  recordCount: number;
  updatedAt: string;
  schema: Array<{ id: string; name: string; type: string }>;
};
type MockRecord = { id: string; data: JsonObject; createdAt: string; updatedAt: string };
type MockTask = { id: string; title: string; status: 'pending' | 'completed'; nodeId: string; assigneeId: string };
type MockApproval = { id: string; status: 'pending' | 'completed'; nodeId: string; approverId: string; decision?: 'approved' | 'rejected' };
type MockNodeExecution = { id: string; nodeId: string; nodeType: string; status: string; output?: unknown; startedAt: string; completedAt?: string | null };
type MockRun = {
  id: string;
  workflowId: string;
  status: string;
  triggeredAt: string;
  context: JsonObject;
  variables: JsonObject;
  nodeExecutions: MockNodeExecution[];
  taskItems: MockTask[];
  approvalItems: MockApproval[];
};
type MockWorkflow = { id: string; name: string; status: string; updatedAt: string };

type MockDb = {
  users: MockUser[];
  currentUserId: string;
  collections: MockCollection[];
  recordsByCollection: Record<string, MockRecord[]>;
  workflows: MockWorkflow[];
  runs: MockRun[];
  filesCount: number;
};

const STORAGE_KEY = 'xbuild-mock-db-v1';

function nowIso() { return new Date().toISOString(); }
function uid(prefix: string) { return `${prefix}_${Math.random().toString(36).slice(2, 10)}`; }

function seedDb(): MockDb {
  const collections: MockCollection[] = [
    { id: 'col_customers', name: 'Khách hàng', slug: 'customers', displayGroup: 'crm', recordCount: 0, updatedAt: nowIso(), schema: [
      { id: 'name', name: 'Tên', type: 'text' },
      { id: 'email', name: 'Email', type: 'email' },
      { id: 'phone', name: 'Số điện thoại', type: 'phone' },
      { id: 'status', name: 'Trạng thái', type: 'select' },
    ] },
    { id: 'col_employees', name: 'Nhân viên', slug: 'employees', displayGroup: 'hr', recordCount: 0, updatedAt: nowIso(), schema: [
      { id: 'fullName', name: 'Họ tên', type: 'text' },
      { id: 'department', name: 'Phòng ban', type: 'text' },
      { id: 'startDate', name: 'Ngày vào làm', type: 'date' },
    ] },
  ];

  const customerRecords: MockRecord[] = Array.from({ length: 18 }).map((_, i) => ({
    id: uid('rec'), createdAt: nowIso(), updatedAt: nowIso(),
    data: { name: `Khách hàng ${i + 1}`, email: `kh${i + 1}@company.vn`, phone: `09${String(10000000 + i)}`, status: i % 2 === 0 ? 'Tiềm năng' : 'Đang chăm sóc' },
  }));

  const employeeRecords: MockRecord[] = Array.from({ length: 8 }).map((_, i) => ({
    id: uid('rec'), createdAt: nowIso(), updatedAt: nowIso(),
    data: { fullName: `Nhân viên ${i + 1}`, department: i % 2 === 0 ? 'Kinh doanh' : 'Kỹ thuật', startDate: new Date(Date.now() - i * 86400000 * 30).toISOString() },
  }));

  collections[0].recordCount = customerRecords.length;
  collections[1].recordCount = employeeRecords.length;

  const workflows: MockWorkflow[] = [
    { id: 'wf_onboarding', name: 'Onboarding nhân sự', status: 'published', updatedAt: nowIso() },
    { id: 'wf_contract', name: 'Phê duyệt hợp đồng', status: 'published', updatedAt: nowIso() },
    { id: 'wf_procurement', name: 'Quy trình mua sắm', status: 'draft', updatedAt: nowIso() },
  ];

  const runs: MockRun[] = [
    {
      id: 'run_001', workflowId: 'wf_onboarding', status: 'waiting_task', triggeredAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
      context: { employeeName: 'Trần Văn B', department: 'Kỹ thuật' }, variables: { progress: 60, currentStep: 'Phân công mentor' },
      nodeExecutions: [
        { id: uid('ne'), nodeId: 'trigger_1', nodeType: 'manual_trigger', status: 'completed', output: { triggered: true }, startedAt: nowIso(), completedAt: nowIso() },
        { id: uid('ne'), nodeId: 'task_1', nodeType: 'user_task', status: 'waiting', startedAt: nowIso() },
      ],
      taskItems: [{ id: 'task_001', title: 'Phân công mentor', status: 'pending', nodeId: 'task_1', assigneeId: 'u_member' }], approvalItems: [],
    },
    {
      id: 'run_002', workflowId: 'wf_contract', status: 'waiting_approval', triggeredAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      context: { contractNo: 'HD-2026-001' }, variables: { amount: 120000000 },
      nodeExecutions: [
        { id: uid('ne'), nodeId: 'trigger_2', nodeType: 'manual_trigger', status: 'completed', output: { triggered: true }, startedAt: nowIso(), completedAt: nowIso() },
        { id: uid('ne'), nodeId: 'approval_1', nodeType: 'approval_task', status: 'waiting', startedAt: nowIso() },
      ],
      taskItems: [], approvalItems: [{ id: 'approval_001', status: 'pending', nodeId: 'approval_1', approverId: 'u_member' }],
    },
    {
      id: 'run_003', workflowId: 'wf_onboarding', status: 'completed', triggeredAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
      context: { employeeName: 'Nguyễn Thị C' }, variables: { progress: 100 },
      nodeExecutions: [
        { id: uid('ne'), nodeId: 'trigger_3', nodeType: 'manual_trigger', status: 'completed', output: { triggered: true }, startedAt: nowIso(), completedAt: nowIso() },
        { id: uid('ne'), nodeId: 'end_3', nodeType: 'end', status: 'completed', output: { done: true }, startedAt: nowIso(), completedAt: nowIso() },
      ],
      taskItems: [], approvalItems: [],
    },
  ];

  return {
    users: [
      { id: 'u_admin', fullName: 'Nguyễn Văn Admin', role: 'admin' },
      { id: 'u_manager', fullName: 'Trần Thị Manager', role: 'manager' },
      { id: 'u_member', fullName: 'Lê Văn Member', role: 'member' },
      { id: 'u_viewer', fullName: 'Phạm Thị Viewer', role: 'viewer' },
    ],
    currentUserId: 'u_member',
    collections,
    recordsByCollection: { col_customers: customerRecords, col_employees: employeeRecords },
    workflows,
    runs,
    filesCount: 24,
  };
}

function loadDb(): MockDb {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedDb();
    saveDb(seeded);
    return seeded;
  }
  try { return JSON.parse(raw) as MockDb; }
  catch {
    const seeded = seedDb();
    saveDb(seeded);
    return seeded;
  }
}

function saveDb(db: MockDb) { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }
function getCurrentUser(db: MockDb) { return db.users.find((u) => u.id === db.currentUserId) ?? db.users[0]; }
function parsePath(path: string) { return path.replace(/^\/api\/v1/, ''); }

export const mockApi = {
  reset() {
    const seeded = seedDb();
    saveDb(seeded);
    return seeded;
  },

  async get(path: string, config?: { params?: Record<string, any> }) {
    const db = loadDb();
    const p = parsePath(path);

    if (p === '/dashboard/kpi') {
      const activeRuns = db.runs.filter((r) => ['running', 'waiting_task', 'waiting_approval', 'waiting_timer'].includes(r.status)).length;
      const totalRecords = Object.values(db.recordsByCollection).reduce((sum, arr) => sum + arr.length, 0);
      return { data: { totalCollections: db.collections.length, totalRecords, totalWorkflowDefinitions: db.workflows.length, activeRuns, totalFiles: db.filesCount } };
    }

    if (p === '/dashboard/summary') {
      const me = getCurrentUser(db);
      const myTasksCount = db.runs.flatMap((r) => r.taskItems).filter((t) => t.assigneeId === me.id && t.status === 'pending').length;
      const myApprovalsCount = db.runs.flatMap((r) => r.approvalItems).filter((a) => a.approverId === me.id && a.status === 'pending').length;
      const recentRuns = db.runs.slice().sort((a, b) => +new Date(b.triggeredAt) - +new Date(a.triggeredAt)).slice(0, 5).map((r) => ({ id: r.id, status: r.status, triggeredAt: r.triggeredAt, workflow: { name: db.workflows.find((w) => w.id === r.workflowId)?.name ?? 'Workflow' } }));
      return { data: { myTasksCount, myApprovalsCount, recentRuns } };
    }

    if (p === '/workflows/runs/my-tasks') {
      const me = getCurrentUser(db);
      const tasks = db.runs.flatMap((run) => run.taskItems.filter((t) => t.assigneeId === me.id && t.status === 'pending').map((t) => ({ ...t, run: { workflow: { name: db.workflows.find((w) => w.id === run.workflowId)?.name ?? 'Workflow' } } })));
      const approvals = db.runs.flatMap((run) => run.approvalItems.filter((a) => a.approverId === me.id && a.status === 'pending').map((a) => ({ ...a, run: { workflow: { name: db.workflows.find((w) => w.id === run.workflowId)?.name ?? 'Workflow' } } })));
      return { data: { tasks, approvals } };
    }

    if (p === '/collections') {
      const search = (config?.params?.search ?? '').toString().toLowerCase();
      return { data: db.collections.filter((c) => !search || c.name.toLowerCase().includes(search) || c.slug.toLowerCase().includes(search)) };
    }

    if (/^\/collections\/[^/]+$/.test(p)) {
      const id = p.split('/')[2];
      const collection = db.collections.find((x) => x.id === id);
      if (!collection) throw new Error('Collection not found');
      return { data: collection };
    }

    if (/^\/collections\/[^/]+\/records$/.test(p)) {
      const id = p.split('/')[2];
      const items = db.recordsByCollection[id] ?? [];
      return { data: { items, total: items.length } };
    }

    if (p === '/workflows') {
      const search = (config?.params?.search ?? '').toString().toLowerCase();
      return { data: { items: db.workflows.filter((w) => !search || w.name.toLowerCase().includes(search)) } };
    }

    if (p === '/workflows/runs/all') {
      const items = db.runs.slice().sort((a, b) => +new Date(b.triggeredAt) - +new Date(a.triggeredAt)).map((r) => ({ id: r.id, status: r.status, triggeredAt: r.triggeredAt, workflow: { name: db.workflows.find((w) => w.id === r.workflowId)?.name ?? 'Workflow' } }));
      return { data: { items } };
    }

    if (/^\/workflows\/runs\/[^/]+$/.test(p)) {
      const runId = p.split('/')[3];
      const run = db.runs.find((r) => r.id === runId);
      if (!run) throw new Error('Run not found');
      return { data: { ...run, workflow: { name: db.workflows.find((w) => w.id === run.workflowId)?.name ?? 'Workflow' } } };
    }

    throw new Error(`Mock GET not implemented: ${p}`);
  },

  async post(path: string, body?: any) {
    const db = loadDb();
    const p = parsePath(path);

    if (/^\/workflows\/tasks\/[^/]+\/complete$/.test(p)) {
      const taskId = p.split('/')[3];
      for (const run of db.runs) {
        const task = run.taskItems.find((t) => t.id === taskId);
        if (!task) continue;
        task.status = 'completed';
        const node = run.nodeExecutions.find((n) => n.nodeId === task.nodeId);
        if (node) {
          node.status = 'completed';
          node.output = { completed: true, formValues: body?.formValues ?? {} };
          node.completedAt = nowIso();
        }
        const hasPending = run.taskItems.some((t) => t.status === 'pending') || run.approvalItems.some((a) => a.status === 'pending');
        if (!hasPending) run.status = 'completed';
        saveDb(db);
        return { data: { success: true } };
      }
      throw new Error('Task not found');
    }

    if (/^\/workflows\/approvals\/[^/]+\/decision$/.test(p)) {
      const approvalId = p.split('/')[3];
      for (const run of db.runs) {
        const approval = run.approvalItems.find((a) => a.id === approvalId);
        if (!approval) continue;
        approval.status = 'completed';
        approval.decision = body?.decision ?? 'approved';
        const node = run.nodeExecutions.find((n) => n.nodeId === approval.nodeId);
        if (node) {
          node.status = 'completed';
          node.output = { decision: approval.decision, note: body?.note ?? '' };
          node.completedAt = nowIso();
        }
        const hasPending = run.taskItems.some((t) => t.status === 'pending') || run.approvalItems.some((a) => a.status === 'pending');
        run.status = hasPending ? 'running' : 'completed';
        saveDb(db);
        return { data: { success: true } };
      }
      throw new Error('Approval not found');
    }

    throw new Error(`Mock POST not implemented: ${p}`);
  },
};
