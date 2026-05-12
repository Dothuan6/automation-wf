import { createRouter, createRoute, createRootRoute, Outlet, redirect } from '@tanstack/react-router';
import { AppShell } from './components/shell/AppShell';
import { useAuthStore } from './stores/auth.store';
import React from 'react';

const LoginPage = React.lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const MyTasksPage = React.lazy(() => import('./pages/MyTasksPage').then((m) => ({ default: m.MyTasksPage })));
const CollectionsHubPage = React.lazy(() => import('./pages/CollectionsHubPage').then((m) => ({ default: m.CollectionsHubPage })));
const CollectionDetailPage = React.lazy(() => import('./pages/CollectionDetailPage').then((m) => ({ default: m.CollectionDetailPage })));
const WorkflowsPage = React.lazy(() => import('./pages/WorkflowsPage').then((m) => ({ default: m.WorkflowsPage })));
const WorkflowEditorPage = React.lazy(() => import('./pages/WorkflowEditorPage').then((m) => ({ default: m.WorkflowEditorPage })));
const WorkflowRunDetailPage = React.lazy(() => import('./pages/WorkflowRunDetailPage').then((m) => ({ default: m.WorkflowRunDetailPage })));
const FilesPage = React.lazy(() => import('./pages/FilesPage').then((m) => ({ default: m.FilesPage })));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const HelpPage = React.lazy(() => import('./pages/HelpPage').then((m) => ({ default: m.HelpPage })));

function Suspense({ children }: { children: React.ReactNode }) {
  return <React.Suspense fallback={<div style={{ padding: 32, color: '#5F6368' }}>Dang tai...</div>}>{children}</React.Suspense>;
}

const rootRoute = createRootRoute({ component: Outlet });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => <Suspense><LoginPage /></Suspense>,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: '/login' });
  },
  component: () => <AppShell><Suspense><Outlet /></Suspense></AppShell>,
});

const indexRoute = createRoute({ getParentRoute: () => appRoute, path: '/', component: DashboardPage });
const myTasksRoute = createRoute({ getParentRoute: () => appRoute, path: '/my-tasks', component: MyTasksPage });
const collectionsRoute = createRoute({ getParentRoute: () => appRoute, path: '/collections', component: CollectionsHubPage });
const collectionDetailRoute = createRoute({ getParentRoute: () => appRoute, path: '/collections/$collectionId', component: CollectionDetailPage });
const workflowsRoute = createRoute({ getParentRoute: () => appRoute, path: '/workflows', component: WorkflowsPage });
const workflowRunsRoute = createRoute({ getParentRoute: () => appRoute, path: '/workflows/runs', component: WorkflowsPage });
const workflowEditorRoute = createRoute({ getParentRoute: () => appRoute, path: '/workflows/$workflowId/edit', component: WorkflowEditorPage });
const workflowRunDetailRoute = createRoute({ getParentRoute: () => appRoute, path: '/workflows/runs/$runId', component: WorkflowRunDetailPage });
const filesRoute = createRoute({ getParentRoute: () => appRoute, path: '/files', component: FilesPage });
const reportsRoute = createRoute({ getParentRoute: () => appRoute, path: '/reports', component: ReportsPage });
const settingsRoute = createRoute({ getParentRoute: () => appRoute, path: '/settings', component: SettingsPage });
const helpRoute = createRoute({ getParentRoute: () => appRoute, path: '/help', component: HelpPage });

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([
    indexRoute, myTasksRoute,
    collectionsRoute, collectionDetailRoute,
    workflowsRoute, workflowRunsRoute, workflowEditorRoute, workflowRunDetailRoute,
    filesRoute, reportsRoute, settingsRoute, helpRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}
