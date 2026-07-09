# Phân Tích Tính Năng — Phần Mềm Giao Việc Phòng Marketing (GTask)

**Phiên bản:** 1.0 · **Ngày:** 09/07/2026
**Quy mô:** Nội bộ phòng Marketing, ~10–30 người dùng
**Cơ cấu:** Phòng Marketing gồm 3 nhóm: **Content**, **Media**, **CRM**

---

## 1. Tổng quan

Hệ thống quản lý và giao việc nội bộ cho phòng Marketing, cho phép trưởng phòng và leader các nhóm giao việc, theo dõi tiến độ, trao đổi và báo cáo hiệu suất theo từng nhóm nhỏ.

**Mục tiêu chính:**

- Chuẩn hóa quy trình giao việc — nhận việc — báo cáo hoàn thành.
- Minh bạch tiến độ công việc theo nhóm và theo cá nhân.
- Giảm giao việc qua chat/Zalo bị trôi, không truy vết được.
- Báo cáo hiệu suất phục vụ đánh giá cuối tháng/quý.

**Ngoài phạm vi (giai đoạn 1):** chấm công, tính lương, quản lý ngân sách chiến dịch, tích hợp mạng xã hội.

---

## 2. Vai trò & Phân quyền

| Vai trò | Mô tả | Quyền chính |
|---|---|---|
| **Admin** | Quản trị hệ thống (có thể kiêm Trưởng phòng) | Quản lý user, nhóm, cấu hình hệ thống, xem tất cả |
| **Trưởng phòng (Manager)** | Quản lý toàn phòng Marketing | Giao việc cho mọi nhóm/cá nhân, duyệt việc, xem báo cáo toàn phòng |
| **Leader nhóm** | Trưởng nhóm Content / Media / CRM | Giao việc trong nhóm mình, duyệt việc của thành viên, báo cáo nhóm |
| **Nhân viên (Member)** | Thành viên nhóm | Nhận việc, cập nhật tiến độ, tự tạo việc cá nhân, bình luận |

**Ma trận phân quyền chi tiết:**

| Hành động | Admin | Manager | Leader | Member |
|---|:-:|:-:|:-:|:-:|
| Tạo/sửa/xóa user, nhóm | ✅ | ❌ | ❌ | ❌ |
| Giao việc cho bất kỳ ai | ✅ | ✅ | ❌ | ❌ |
| Giao việc trong nhóm mình | ✅ | ✅ | ✅ | ❌ |
| Tự tạo việc cho bản thân | ✅ | ✅ | ✅ | ✅ |
| Sửa/xóa việc mình tạo | ✅ | ✅ | ✅ | ✅ |
| Duyệt việc hoàn thành | ✅ | ✅ | ✅ (nhóm mình) | ❌ |
| Cập nhật trạng thái việc được giao | ✅ | ✅ | ✅ | ✅ |
| Xem báo cáo toàn phòng | ✅ | ✅ | ❌ | ❌ |
| Xem báo cáo nhóm | ✅ | ✅ | ✅ (nhóm mình) | ❌ |
| Xem việc của người khác cùng nhóm | ✅ | ✅ | ✅ | ✅ (chỉ xem) |

> Một user có thể thuộc nhiều nhóm (VD: nhân viên Content kiêm CRM). Quyền Leader gắn theo từng nhóm, không phải toàn cục.

---

## 3. Phân tích tính năng

### 3.1. Quản lý tổ chức

- **Quản lý nhóm:** tạo/sửa nhóm (mặc định 3 nhóm Content, Media, CRM; cho phép thêm nhóm mới sau này), gán leader, thêm/bớt thành viên.
- **Quản lý thành viên:** hồ sơ cơ bản (tên, email, avatar, chức danh, nhóm), trạng thái active/inactive.
- **Đăng nhập:** email + mật khẩu; nên hỗ trợ đăng nhập Google Workspace nếu công ty dùng Gmail.

### 3.2. Giao việc (Core)

**Thuộc tính một công việc (Task):**

| Thuộc tính | Mô tả |
|---|---|
| Tiêu đề, mô tả | Mô tả hỗ trợ rich text (định dạng, link, ảnh) |
| Người giao (assigner) | Tự động ghi nhận người tạo |
| Người thực hiện (assignee) | 1 người chịu trách nhiệm chính + người theo dõi (followers) |
| Nhóm | Content / Media / CRM (task có thể liên nhóm — xem 3.4) |
| Deadline | Ngày giờ hạn chót; hỗ trợ ngày bắt đầu |
| Độ ưu tiên | Thấp / Trung bình / Cao / Khẩn cấp |
| Trạng thái | Mới → Đang làm → Chờ duyệt → Hoàn thành / Từ chối (trả lại) |
| Nhãn (labels) | Tùy chọn, VD: "Chiến dịch Tết", "Website", "Fanpage" |
| Checklist | Danh sách đầu việc con, tick từng mục |
| File đính kèm | Upload file hoặc dán link (Google Drive...) |
| Task con (subtask) | Chia nhỏ việc lớn, mỗi subtask có assignee riêng |
| Việc lặp lại | Hàng ngày/tuần/tháng (VD: báo cáo tuần, đăng bài định kỳ) |

**Vòng đời trạng thái:**

```
Mới ──nhận việc──▶ Đang làm ──nộp──▶ Chờ duyệt ──duyệt──▶ Hoàn thành
                      ▲                    │
                      └────trả lại (kèm lý do)────┘
Bất kỳ trạng thái nào ──▶ Hủy (chỉ người giao/Manager)
```

- Quá deadline mà chưa hoàn thành → tự động gắn cờ **Trễ hạn** (không đổi trạng thái).
- Mọi thay đổi trạng thái, deadline, assignee đều ghi **lịch sử hoạt động** (audit log).

### 3.3. Trao đổi & Thông báo

- **Bình luận** trong task: hỗ trợ @mention, đính kèm file, sửa/xóa bình luận của mình.
- **Thông báo in-app** (chuông): được giao việc, bị @mention, việc bị trả lại, việc được duyệt, sắp đến hạn (trước 24h và 1h), quá hạn.
- **Thông báo email** (tùy chọn bật/tắt theo user): tóm tắt các sự kiện trên.
- Giai đoạn 2 có thể tích hợp thông báo qua Zalo OA / Telegram / Slack.

### 3.4. Đặc thù theo nhóm

Task có trường **"loại việc"** cấu hình theo nhóm, kèm trường mở rộng:

**Nhóm Content**
- Loại việc: viết bài website, bài social, kịch bản video, email marketing, SEO...
- Trường mở rộng: kênh đăng, số lượng từ, link bài viết/tài liệu.
- Quy trình duyệt 2 bước phù hợp đặc thù duyệt bài: Nháp → Chờ duyệt nội dung → Hoàn thành.
- **Lịch nội dung (Content Calendar):** view lịch hiển thị task theo ngày đăng dự kiến.

**Nhóm Media**
- Loại việc: thiết kế ảnh, dựng video, chụp/quay, in ấn...
- Trường mở rộng: kích thước/định dạng file, link brief, link file thành phẩm.
- Task Media thường là **task con của task Content** (bài viết cần ảnh) → cần liên kết task liên nhóm.

**Nhóm CRM**
- Loại việc: gọi/chăm sóc khách hàng, gửi SMS/email chiến dịch, làm sạch data, khảo sát...
- Trường mở rộng: số lượng khách cần xử lý, kết quả (số gọi thành công...).
- Việc lặp lại dùng nhiều nhất ở nhóm này (chăm sóc định kỳ).

> **Thiết kế kỹ thuật:** dùng 1 bảng task chung + trường `custom_fields` (JSON) theo loại việc, tránh tách 3 module riêng gây khó bảo trì.

### 3.5. Hiển thị & Tìm kiếm

- **Kanban board** theo trạng thái (mặc định), kéo thả đổi trạng thái.
- **Danh sách (list view):** sắp xếp theo deadline, ưu tiên; lọc theo nhóm, người thực hiện, trạng thái, nhãn, khoảng thời gian.
- **Lịch (calendar view):** task theo deadline — dùng làm Content Calendar.
- **"Việc của tôi":** trang cá nhân gom mọi việc được giao, nhóm theo hạn (hôm nay / tuần này / trễ hạn).
- Tìm kiếm toàn văn theo tiêu đề, mô tả, bình luận.

### 3.6. Báo cáo & Dashboard

- **Dashboard Manager:** tổng task theo trạng thái, tỷ lệ đúng hạn/trễ hạn theo nhóm, biểu đồ khối lượng việc theo tuần/tháng, top thành viên trễ hạn.
- **Dashboard Leader:** tương tự nhưng giới hạn trong nhóm.
- **Báo cáo cá nhân:** số việc hoàn thành, tỷ lệ đúng hạn theo tháng.
- Xuất Excel danh sách task theo bộ lọc (phục vụ báo cáo cuối tháng).

### 3.7. Tính năng hệ thống

- Audit log toàn hệ thống (ai làm gì, khi nào).
- Sao lưu dữ liệu tự động hàng ngày.
- Responsive — dùng tốt trên điện thoại (nhân viên CRM, Media hay di chuyển).

---

## 4. Luồng nghiệp vụ chính

**Luồng giao việc chuẩn:**

1. Manager/Leader tạo task: chọn nhóm, loại việc, assignee, deadline, độ ưu tiên, đính kèm brief.
2. Assignee nhận thông báo → mở task → chuyển "Đang làm" (hoặc bình luận hỏi lại nếu brief chưa rõ).
3. Làm xong → đính kèm kết quả → chuyển "Chờ duyệt".
4. Người giao duyệt: **Duyệt** → Hoàn thành, hoặc **Trả lại** kèm lý do → quay về "Đang làm".
5. Hệ thống ghi nhận thời gian hoàn thành, tính đúng hạn/trễ hạn vào báo cáo.

**Luồng liên nhóm (VD: bài viết cần ảnh):**

1. Leader Content tạo task "Viết bài khuyến mãi tháng 8" giao cho nhân viên Content.
2. Trong task, tạo subtask "Thiết kế 3 ảnh cho bài khuyến mãi" → gắn nhóm Media.
3. Leader Media nhận thông báo, gán assignee trong nhóm mình (hoặc Manager gán trực tiếp).
4. Task Content chỉ hoàn thành khi subtask Media hoàn thành.

---

## 5. Thiết kế Database

CSDL quan hệ (PostgreSQL). Các bảng chính:

```
users            (id, name, email, password_hash, avatar_url, title, role*, is_active, created_at)
                  *role: admin | manager | member  (leader xét theo team_members)

teams            (id, name, description, created_at)          -- Content, Media, CRM
team_members     (id, team_id, user_id, is_leader, joined_at) -- 1 user nhiều nhóm

task_types       (id, team_id, name, custom_field_schema JSON) -- loại việc theo nhóm

tasks            (id, title, description, team_id, task_type_id,
                  assigner_id, assignee_id, parent_task_id,
                  status, priority, start_date, due_date, completed_at,
                  is_recurring, recurrence_rule, custom_fields JSON,
                  created_at, updated_at)

task_followers   (task_id, user_id)
task_checklists  (id, task_id, content, is_done, position)
labels           (id, name, color)
task_labels      (task_id, label_id)

comments         (id, task_id, user_id, content, created_at, updated_at)
attachments      (id, task_id, comment_id?, file_name, file_url, size, uploaded_by)

notifications    (id, user_id, type, task_id, content, is_read, created_at)
activity_logs    (id, task_id, user_id, action, old_value JSON, new_value JSON, created_at)
```

**Ghi chú thiết kế:**

- `parent_task_id` phục vụ subtask và task liên nhóm (subtask có `team_id` khác cha).
- `custom_field_schema` trong `task_types` định nghĩa trường mở rộng; `custom_fields` trong `tasks` lưu giá trị → thêm loại việc mới không cần sửa schema.
- `recurrence_rule` lưu chuẩn RRULE (VD: `FREQ=WEEKLY;BYDAY=MO`); cron job tạo task mới theo lịch.
- Index: `tasks(assignee_id, status)`, `tasks(team_id, due_date)`, `notifications(user_id, is_read)`.

---

## 6. Kiến trúc & Tech Stack đề xuất

Quy mô 10–30 người → **stack đã chốt: Supabase + Vercel** — không tự vận hành server, chi phí thấp, tận dụng tối đa dịch vụ có sẵn.

| Thành phần | Đề xuất | Lý do |
|---|---|---|
| Frontend | **Next.js** + TailwindCSS, deploy trên **Vercel** | Deploy 1 chạm, có API routes cho logic phía server; sẵn thư viện kanban (dnd-kit), calendar (FullCalendar) |
| Database | **Supabase PostgreSQL** | Khớp thiết kế DB ở mục 5 (JSON custom_fields, index); managed, backup tự động (gói Pro) |
| Auth | **Supabase Auth** | Email + mật khẩu, Google login (Google Workspace) có sẵn |
| Phân quyền | **Row Level Security (RLS)** + bảng `team_members` | Enforce quyền theo nhóm ngay tầng DB (Leader chỉ giao việc trong nhóm mình...) |
| File storage | **Supabase Storage** | File đính kèm, avatar; kèm policy phân quyền |
| Realtime | **Supabase Realtime** | Cập nhật kanban, thông báo in-app không cần tự dựng WebSocket |
| Cron (việc lặp lại, nhắc deadline) | **pg_cron** (Supabase) hoặc Vercel Cron | Tạo task định kỳ theo RRULE, quét task sắp đến hạn/quá hạn |
| Email thông báo | Resend hoặc Supabase Auth SMTP | Gói free đủ cho quy mô 30 người |

**Chi phí dự kiến:**

- Thử nghiệm/pilot: free tier cả Supabase lẫn Vercel — 0đ.
- Chạy chính thức: Supabase Pro ($25/tháng — free tier tự pause khi không hoạt động, không có backup tự động) + Vercel Pro ($20/tháng — gói Hobby không dành cho mục đích thương mại/nội bộ doanh nghiệp).

**Domain:** dùng subdomain của công ty, VD `task.tencongty.com`, trỏ CNAME về Vercel (miễn phí). Nếu mua mới: `.com` ~$10–12/năm (Cloudflare, Namecheap) hoặc `.vn`/`.com.vn` ~400–700k/năm (PA Việt Nam, Mắt Bão).

**Lưu ý kỹ thuật:** logic phân quyền viết bằng RLS policy (SQL) khó debug hơn code backend; với các luồng phức tạp (duyệt việc, task liên nhóm) có thể dùng thêm Next.js API routes + Supabase service key làm tầng nghiệp vụ.

**Phương án tham khảo trước khi code:** cân nhắc thử nghiệm quy trình trên công cụ có sẵn (Trello, ClickUp, Lark...) 1–2 tuần để chốt quy trình thật, rồi mới code — tránh xây tính năng không ai dùng.

---

## 7. Lộ trình phát triển (đề xuất)

| Giai đoạn | Nội dung | Thời lượng ước tính |
|---|---|---|
| **MVP** | Đăng nhập, quản lý nhóm/user, CRUD task, trạng thái, deadline, kanban + list view, bình luận, thông báo in-app, "Việc của tôi" | 4–6 tuần |
| **Giai đoạn 2** | Duyệt việc, subtask liên nhóm, loại việc + custom fields, checklist, file đính kèm, calendar view, thông báo email | 3–4 tuần |
| **Giai đoạn 3** | Dashboard báo cáo, xuất Excel, việc lặp lại, audit log, tìm kiếm toàn văn | 3–4 tuần |

**Tiêu chí thành công MVP:** 100% việc trong phòng được giao qua hệ thống thay vì chat; đo được tỷ lệ đúng hạn theo nhóm sau tháng đầu.
