# XBuild Project Review & Update Plan

## 1) Scope Review
- Reviewed monorepo structure: `apps/api` (NestJS + Prisma), `apps/web` (React + MUI + TanStack Router).
- Reviewed all main frontend pages/components and all API controllers with core services.
- Objective of this document: propose a practical, prioritized update plan before implementation.

## 2) Executive Summary
- Current status: backend has many real capabilities, frontend is mostly UI prototype with mock data.
- Biggest UX blocker: text encoding corruption (Vietnamese characters broken) appears across almost all UI labels/messages.
- Biggest functional blocker: most pages are not wired to API yet (dashboard, collections, records, workflows, files, settings, tasks, notifications).
- Architectural mismatch: backend permission-driven workflow is production-oriented; frontend currently skips permission-based rendering and robust error/loading states.

## 3) UI/UX Review

### 3.1 Strengths
- Consistent shell layout (header + nav rail + mobile bottom nav).
- Theme foundation is clean and coherent with SMB ERP style.
- Route structure is clear and scalable.
- Components like `DataTable`, `CommandPalette`, and workflow editor scaffold are good starting points.

### 3.2 Critical UX Issues
- Encoding bug (mojibake) on nearly all Vietnamese text.
- Many actions appear clickable but are non-functional (buttons, icons, tabs, filters).
- No unified empty/loading/error states at page level.
- Accessibility gaps:
  - Some interactive rows use legacy props (`button` on `ListItem`) and may reduce semantic clarity.
  - Keyboard and focus handling are inconsistent outside command palette.
- Navigation gaps:
  - There are links/routes that do not exist (`/help`, `/settings/users`, `/workflows/runs`).
- Mobile UX not fully verified for dense screens (data/workflow pages likely overflow complexity).

### 3.3 Visual/Design Gaps
- System still feels prototype because data realism and interaction feedback are missing.
- No stateful feedback patterns (success toasts, inline validation summary, progressive loading skeleton at screen level).
- Notification center and user menu are hardcoded mock data.

## 4) Functional Review (Frontend vs Backend)

### 4.1 Authentication & Session
- Frontend login/logout and token refresh are connected.
- Risk: `auth.store.ts` fetches `/users/:id` after login; this depends on `member.list` permission. If a role lacks this permission, profile fetch can fail right after successful login.
- Missing frontend flows: MFA login/verification, invitation acceptance.

### 4.2 Dashboard
- Frontend uses mock KPIs/tasks/activity.
- Backend already provides `/dashboard/summary` and `/dashboard/kpi`.
- Gap: no API integration and no mapping from backend run/task data to cards/feed.

### 4.3 Collections & Records
- Frontend pages are fully mock.
- Backend supports:
  - collections list/detail/create/schema update/delete
  - records list/create/update/delete
  - filter/sort/pagination logic in service
- Gap: no query/mutation integration, no schema-driven form builder yet.

### 4.4 Workflows
- Frontend pages/editor/run-detail are mock.
- Backend supports workflow definitions, versions, publish, run start/cancel, task complete, approval decision.
- Gap: editor JSON persistence and validation integration not wired.
- Gap: run timeline UI not mapped to real `nodeExecutions`/`taskItems`/`approvalItems`.

### 4.5 My Tasks
- Frontend is mock.
- Backend has `/workflows/runs/my-tasks` and task/approval completion endpoints.
- Gap: no API integration and no optimistic/rollback handling.

### 4.6 Files
- Frontend is mock file cards.
- Backend supports presigned upload + complete upload + download + delete.
- Gap: upload pipeline (client direct upload to S3) not implemented in UI.

### 4.7 Settings & Users
- Frontend tabs are mock, includes hardcoded AI endpoint/model form.
- Backend supports app settings read/update and users CRUD/invite/role/permission/suspend.
- Gap: no data binding, no permission-guarded controls in UI.

### 4.8 Virtual Agent
- Backend has real conversation + OpenAI integration with intent parsing and preview confirmation.
- Frontend currently has no agent UI.

## 5) Technical Risk & Quality Issues
- Encoding inconsistency suggests file encoding/config pipeline issue (likely UTF-8 vs ANSI interpretation).
- Some API contracts use `any` DTO bodies; frontend integration should introduce typed API contracts to avoid drift.
- Error handling strategy in frontend is incomplete (currently mostly redirect-on-401 only).
- Testing coverage appears minimal/absent for both frontend and backend.

## 6) Proposed Update Plan (for approval)

## Phase 0 - Stabilize Foundation (High Priority)
- Fix encoding globally to proper UTF-8 for all frontend/backend user-facing strings.
- Audit and fix broken routes/links (`/help`, `/settings/users`, `/workflows/runs`).
- Create shared UI state patterns: page-level loading, empty, error components.
- Add global toast/notification mechanism for mutation feedback.

## Phase 1 - Wire Core Real Data (High Priority)
- Integrate Dashboard with `/dashboard/kpi` + `/dashboard/summary`.
- Replace mock data in:
  - Collections hub + detail (list + records list)
  - My Tasks (tasks/approvals feed)
  - Workflows list + runs list + run detail
- Standardize API hooks layer with React Query (`queries` + `mutations` + cache keys).

## Phase 2 - Complete CRUD Workflows (High Priority)
- Collections:
  - Create collection flow
  - Create/edit/delete record flow
  - Basic filter/search/sort/pagination synced with backend
- Workflows:
  - Save draft version
  - Publish version
  - Start/cancel run
  - Complete task / submit approval in run detail

## Phase 3 - Files + Settings + User Admin (Medium Priority)
- Files:
  - Implement presigned upload flow (presign -> PUT -> complete)
  - Download/delete actions with permission checks
- Settings:
  - Read/update settings by category
- Users:
  - List users, invite user, set role/permissions, suspend/restore

## Phase 4 - UX Polish & Accessibility (Medium Priority)
- Improve responsive behavior on dense pages (table/workflow).
- Keyboard navigation and focus states for key interactive zones.
- Improve form validation UX (inline + summary).
- Replace remaining placeholder interactions and add micro-feedback.

## Phase 5 - Advanced Features (Optional / Next Sprint)
- MFA and invitation acceptance screens.
- Virtual agent UI with preview confirmation flow.
- Notification center backed by real data.

## 7) Suggested Delivery Slices
- Slice A (quick win): Phase 0 + Dashboard + My Tasks.
- Slice B: Collections end-to-end.
- Slice C: Workflows end-to-end.
- Slice D: Files + Settings + Users.
- Slice E: Agent + advanced UX polish.

## 8) Acceptance Criteria for “Ready to Implement”
- No mojibake in UI strings.
- No broken nav route.
- At least Dashboard, Collections, My Tasks, Workflows using real API data.
- Mutations have success/failure feedback and cache invalidation.
- Permission-based UI visibility for sensitive actions.

## 9) Notes Before Implementation
- This plan intentionally prioritizes data truth and functional completeness over visual redesign.
- If desired, we can split into 2 tracks in implementation phase:
  - Track 1: function-first
  - Track 2: visual refinement and interaction quality
