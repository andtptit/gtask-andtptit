# GTask — Phần mềm giao việc phòng Marketing

v2: giao việc, kanban kéo thả **realtime**, duyệt/trả lại việc, task con liên nhóm, bình luận có **@mention**, **file đính kèm**, **nhãn chiến dịch**, người theo dõi, danh sách + tìm kiếm + bộ lọc, **lịch công việc (Content Calendar)**, **dashboard báo cáo**, thông báo in-app, quản trị nhóm & **admin tạo tài khoản thành viên** (3 nhóm mặc định: Content, Media, CRM).

**Stack:** Next.js 14 (App Router) + Supabase (Postgres, Auth, Storage, Realtime, RLS) + TailwindCSS, deploy Vercel (domain miễn phí `*.vercel.app`).

## 1. Thiết lập Supabase

1. Tạo project tại [supabase.com](https://supabase.com) (free tier).
2. Mở **SQL Editor** → dán toàn bộ nội dung `supabase/schema.sql` → Run.
3. Tiếp tục chạy lần lượt `supabase/migration-v2.sql` → `migration-v3.sql` → `migration-v4-perf.sql` → `migration-v5.sql` → `migration-v6.sql` → `migration-v7.sql` → `migration-v8.sql`.
4. Tiếp tục dán `supabase/migration-v3.sql` → Run (enforce luồng duyệt việc ở DB, chặn đổi người giao việc, admin xóa được file).
5. Tiếp tục dán `supabase/migration-v4-perf.sql` → Run (index tăng tốc truy vấn).
6. Tiếp tục dán `supabase/migration-v5.sql` → Run (realtime cho chuông thông báo).
7. (Khuyến nghị cho nội bộ) Tắt xác nhận email: **Authentication → Sign In / Providers → Email → tắt "Confirm email"** — đăng ký xong dùng được ngay.
8. Lấy **Project URL**, **anon key** và **service_role key** tại **Settings → API**.

## 2. Chạy local

```bash
cp .env.local.example .env.local   # điền URL + anon key + service_role key
npm install
npm run dev                        # http://localhost:3000
```

`SUPABASE_SERVICE_ROLE_KEY` chỉ cần cho tính năng **admin tạo tài khoản thành viên** — không commit lên git, không lộ ra client.

## 3. Tạo tài khoản admin đầu tiên

1. Mở app → **Đăng ký** tài khoản.
2. Vào Supabase SQL Editor chạy:

```sql
update public.profiles set role = 'admin' where email = 'email-cua-ban@gmail.com';
```

3. Đăng nhập lại → menu **Quản trị** hiện ra → gán thành viên vào nhóm, chọn leader (⭐).

## 4. Deploy Vercel (domain miễn phí)

1. Push code lên GitHub.
2. Vào [vercel.com](https://vercel.com) → **Add New Project** → import repo.
3. Thêm 3 biến môi trường: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
4. Deploy → nhận domain miễn phí dạng `https://gtask-xxx.vercel.app`.

**Tốc độ:** `vercel.json` đã pin serverless function về region `sin1` (Singapore) để nằm cạnh Supabase — quan trọng nhất cho độ trễ. Khi tạo project Supabase hãy chọn region **Southeast Asia (Singapore)**; nếu Supabase của bạn ở region khác, sửa `sin1` trong `vercel.json` thành region Vercel gần đó ([danh sách](https://vercel.com/docs/edge-network/regions)).

## Phân quyền

| Vai trò | Quyền |
|---|---|
| Admin | Tất cả + đổi vai trò thành viên |
| Trưởng phòng (manager) | Giao việc cho bất kỳ ai, duyệt việc, quản lý nhóm |
| Leader (⭐ theo nhóm) | Giao việc & duyệt việc trong nhóm mình |
| Nhân viên | Nhận việc, cập nhật trạng thái, tự tạo việc cho mình, bình luận |

Phân quyền được enforce bằng **Row Level Security** ngay tầng database (xem `supabase/schema.sql`).

## Luồng trạng thái

`Mới → Đang làm → Chờ duyệt → Hoàn thành` (người duyệt có thể **Trả lại** kèm lý do → quay về Đang làm; người giao/manager có thể **Hủy**).

## Ghi chú v2

- **File đính kèm** lưu trong bucket `attachments` (public read — công cụ nội bộ; đổi sang signed URL nếu cần bảo mật hơn). Tối đa 20MB/file.
- **@mention:** gõ `@` trong ô bình luận để chọn người — người được nhắc nhận thông báo riêng.
- **Theo dõi:** bấm 🔔 trên task để nhận thông báo khi đổi trạng thái/bình luận.
- **Realtime** bật cho bảng `tasks` — kanban và lịch tự cập nhật khi người khác thay đổi.
- **Báo cáo:** admin/trưởng phòng xem toàn phòng; leader chỉ thấy nhóm mình.
- **Admin tạo thành viên:** trang Quản trị → "Thêm thành viên mới" (mật khẩu mặc định `GTask@123` nếu bỏ trống).

## Ghi chú v3 (migration-v6)

- **Kết quả công việc:** mỗi task có mục "📝 Kết quả công việc" — người thực hiện viết kết quả hoặc dán link Drive/Docs/bài đăng.
- **Chặn nộp duyệt rỗng:** nút "Nộp duyệt" (và kéo thẻ vào cột Chờ duyệt) yêu cầu đã điền kết quả HOẶC có file đính kèm — enforce cả ở app lẫn trigger DB.
- **Thêm người theo dõi:** tại task, chọn thành viên (kể cả nhóm khác) → "+ Thêm theo dõi". Người được thêm nhận thông báo và theo dõi đầy đủ diễn biến task (đổi trạng thái, bình luận, kết quả). Gỡ theo dõi: chính mình hoặc admin/manager.

## Ghi chú v4 (migration-v7)

- **Phân quyền động:** trang Quản trị → "Phân quyền vai trò" — admin tích chọn từng quyền cho Manager / Leader / Nhân viên (Admin cố định full quyền). Nút **"↺ Reset về mặc định"** khôi phục đúng ma trận ban đầu. Quyền được enforce ở cả UI lẫn tầng DB (RLS/trigger đọc bảng `role_permissions`).
- Ý nghĩa scope: quyền "Duyệt việc" với Manager áp dụng mọi nhóm, với Leader/Nhân viên chỉ áp dụng nhóm mình tham gia; tắt "Xem việc của người khác" thì user chỉ thấy việc mình giao/nhận/theo dõi.
- **Chặn deadline quá khứ:** tạo hoặc sửa deadline về thời điểm quá khứ sẽ bị từ chối (cả việc cha lẫn task con) — check ở server action + trigger DB. Task cũ đã trễ hạn vẫn sửa được các field khác bình thường.

## Ghi chú v5 (migration-v8)

- **Sửa thông tin việc** (tiêu đề, mô tả, nhóm, người thực hiện, ưu tiên, deadline): chỉ **admin, manager và người giao việc**. Follower/member/leader không sửa được — chặn ở cả UI lẫn trigger DB `protect_task_info` (gọi API trực tiếp cũng bị từ chối). Người thực hiện vẫn đổi trạng thái + điền kết quả bình thường.
- **Thông báo khi sửa:** mọi thay đổi thông tin task đều bắn chuông 🔔 cho người giao, người thực hiện (cũ + mới nếu bị đổi người) và toàn bộ người theo dõi.

## Ghi chú v6 (quản lý user nghỉ việc)

- **Xóa user (admin):** trang Quản trị → nút "Xóa" ở mỗi thành viên — chỉ xóa được tài khoản **chưa phát sinh** task/bình luận/file (dành cho tài khoản tạo nhầm). User đã hoạt động sẽ bị từ chối kèm hướng dẫn dùng Active. Không tự xóa được chính mình.
- **Chặn user inactive:** bỏ tick Active là chặn hoàn toàn — đăng nhập mới bị từ chối ngay tại trang login; phiên đang mở bị đăng xuất ở lần tải trang kế tiếp. Quy trình nhân viên nghỉ: bỏ tick Active → gán lại task đang mở → (tùy chọn) gỡ khỏi nhóm. Không cần xóa user.

## Chưa có (roadmap)

Checklist, việc lặp lại, xuất Excel, thông báo email, nhắc deadline tự động, custom fields theo nhóm. Xem chi tiết `phan-tich-tinh-nang.md`.
