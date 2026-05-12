# Kế hoạch mockup data và luồng thao tác toàn bộ chức năng dự án XBuild

## 1) Mục tiêu
- Chuẩn hóa dữ liệu giả lập (mockup data) để demo nhất quán toàn hệ thống.
- Chuẩn hóa luồng thao tác người dùng theo vai trò (Admin, Manager, Member, Viewer).
- Tạo nền để team FE/BE/QA triển khai nhanh, test dễ, demo mượt.

## 2) Phạm vi chức năng
- Đăng nhập / phiên làm việc
- Dashboard
- My Tasks (Task + Approval)
- Collections (hub + detail + records)
- Workflows (list, editor, runs, run detail)
- Files
- Settings (Company, Users, AI/Integration, Notifications)
- App Header / Search Command Palette / Notifications / Profile menu
- Virtual Agent (chat, preview, confirm)

## 3) Nguyên tắc thiết kế mock data
- Dữ liệu có ngữ cảnh SMB Việt Nam (nhân sự, hợp đồng, CRM, mua sắm, file nội bộ).
- Mỗi module có đủ trạng thái: loading/empty/success/error.
- Dữ liệu liên kết chéo:
  - Dashboard KPI khớp với Collections/Workflows/Tasks.
  - Task/Approval gắn với workflow run cụ thể.
  - Files gắn folder và uploader hợp lệ.
- Dùng ID thật dạng UUID hoặc slug nhất quán.
- Thời gian dùng timezone `Asia/Ho_Chi_Minh`.

## 4) Bộ mock data chuẩn theo module

## 4.1 Auth + User Profile
- Users:
  - `admin@company.vn` (admin)
  - `manager@company.vn` (manager)
  - `member@company.vn` (member)
  - `viewer@company.vn` (viewer)
- Trạng thái user: active, suspended, pending_invitation.
- Session:
  - access token còn hạn
  - refresh token còn hạn/hết hạn

## 4.2 Dashboard
- KPI:
  - totalCollections, totalRecords, totalWorkflowDefinitions, activeRuns, totalFiles
- Summary user:
  - myTasksCount, myApprovalsCount
  - recentRuns: 5 run gần nhất (đủ trạng thái running/waiting/completed/failed)
- Case edge:
  - KPI = 0
  - user không có task/approval

## 4.3 My Tasks
- Task item mock:
  - priority: high/medium/low
  - dueAt: quá hạn, sắp hạn, chưa đến hạn
  - status: pending/in_progress/completed
- Approval item mock:
  - decision path: approved/rejected
  - có note/không note

## 4.4 Collections + Records
- Collections mẫu:
  - customers, orders, products, employees, expenses
- Schema field mẫu:
  - text, email, phone, currency, date, boolean, select, relation
- Records:
  - mỗi collection 20-50 record để test table/filter/sort
  - có record thiếu optional field
- Filter mẫu:
  - eq/contains/gt/date range

## 4.5 Workflows
- Workflow definitions:
  - Onboarding nhân sự
  - Phê duyệt hợp đồng
  - Nhắc hạn dịch vụ
  - Quy trình mua sắm
- Versioning:
  - draft version
  - published version
- Runs:
  - running, waiting_task, waiting_approval, completed, failed, cancelled
- Node execution:
  - manual_trigger, record_action, user_task, approval_task, notification, end

## 4.6 Files
- Folder tree:
  - Hợp đồng, Nhân sự, Marketing, Tài nguyên
- File records:
  - pdf/xlsx/png/docx
  - size đa dạng nhỏ/lớn
- Flow state:
  - upload success
  - upload fail
  - download link expired
  - delete forbidden (không phải uploader)

## 4.7 Settings + Users
- Company settings:
  - name, phone, address, website
- User management:
  - list/pagination/search
  - invite user
  - đổi role
  - suspend/restore
- AI settings:
  - provider/model/enabled
- Notification settings:
  - in-app/email/slack toggles

## 4.8 Virtual Agent
- Conversation mock:
  - qa intent
  - workflow_launch intent có preview payload
- Confirm flow:
  - confirmed true
  - confirmed false

## 5) Luồng thao tác chuẩn (E2E)

## 5.1 Luồng A: Vào hệ thống và xem tổng quan
1. Mở dashboard.
2. Xem KPI + summary.
3. Mở command palette tìm “Workflow”.
4. Điều hướng sang Workflows.

## 5.2 Luồng B: Xử lý công việc cá nhân
1. Vào My Tasks.
2. Chọn task pending.
3. Hoàn thành task (submit formValues).
4. Kiểm tra trạng thái run cập nhật ở Workflow Run Detail.

## 5.3 Luồng C: Duyệt approval
1. Vào My Tasks tab Approval.
2. Chọn một approval pending.
3. Submit decision (approved/rejected + note).
4. Kiểm tra run chuyển nhánh đúng theo decision.

## 5.4 Luồng D: Quản lý dữ liệu collection
1. Vào Collections Hub.
2. Chọn collection customers.
3. Tìm kiếm + filter record.
4. Tạo record mới.
5. Sửa record.
6. Xóa record.

## 5.5 Luồng E: Vòng đời workflow
1. Tạo workflow draft.
2. Thêm node trong editor.
3. Lưu version draft.
4. Publish version.
5. Trigger run.
6. Theo dõi timeline node execution.
7. Cancel run (nếu cần).

## 5.6 Luồng F: Quản lý file
1. Chọn folder.
2. Upload file (presign -> PUT -> complete-upload).
3. Download file.
4. Delete file (quyền hợp lệ).

## 5.7 Luồng G: Quản trị user/settings
1. Vào Settings > Users.
2. Invite user mới.
3. Đổi role + permissions.
4. Suspend và restore user.
5. Cập nhật AI/Notification settings.

## 5.8 Luồng H: Agent hỗ trợ thao tác
1. Gửi câu hỏi QA.
2. Gửi yêu cầu launch workflow.
3. Nhận preview payload.
4. Confirm action.
5. Kiểm tra workflow run được tạo.

## 6) Ma trận vai trò và quyền thao tác
- Admin: full CRUD + publish/cancel run + settings.manage.
- Manager: đọc/điều phối chính, run workflow, duyệt approval.
- Member: xử lý task, tạo/sửa record theo quyền.
- Viewer: chỉ đọc.

## 7) Kịch bản kiểm thử UI/UX bắt buộc
- Loading skeleton cho mọi page chính.
- Empty state có CTA rõ ràng.
- Error state có retry.
- Responsive:
  - Desktop >= 1280
  - Tablet 768-1279
  - Mobile <= 767
- Keyboard:
  - mở command palette bằng Ctrl/Cmd+K
  - điều hướng list bằng mũi tên + Enter + Esc

## 8) Kế hoạch triển khai theo phase

## Phase 1 (Nền dữ liệu)
- Chuẩn hóa seed data BE cho IAM, collections, workflows, tasks, files.
- Tạo file mock catalog JSON cho FE fallback khi API fail.

## Phase 2 (Luồng cốt lõi)
- Hoàn thiện luồng A/B/C/D/E.
- Đồng bộ trạng thái giữa Dashboard, Tasks, Run detail.

## Phase 3 (Quản trị và file)
- Hoàn thiện luồng F/G.
- Ràng buộc quyền theo role đầy đủ trên UI.

## Phase 4 (Agent + polish)
- Hoàn thiện luồng H.
- Tối ưu UX, thông báo, tracking hành vi.

## 9) Deliverables
- `mock-data-spec.md`: schema + sample payload theo endpoint.
- `user-flows.md`: sơ đồ luồng thao tác theo vai trò.
- `qa-checklist.md`: checklist test theo trạng thái và thiết bị.
- Dữ liệu seed nâng cao trong `apps/api/prisma/seed.ts`.

## 10) Tiêu chí hoàn thành
- Mọi màn hình chính có dữ liệu hợp ngữ cảnh và liên kết chéo.
- Mỗi chức năng có ít nhất 1 luồng success + 1 luồng error.
- Demo end-to-end 8 luồng không đứt đoạn.
- QA pass checklist UI/UX + chức năng theo role.
