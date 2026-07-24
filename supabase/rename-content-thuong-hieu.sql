-- ============================================================
-- Đổi tên nhóm "Content" → "Thương hiệu" trên dữ liệu đang chạy
-- (tên nhóm hiển thị khắp app đều lấy từ bảng teams nên chỉ cần
--  update DB, không cần sửa code)
-- ============================================================

-- 1. Tên nhóm + mô tả
update public.teams
set name = 'Thương hiệu',
    description = replace(description, 'Content', 'Thương hiệu')
where name = 'Content';

-- 2. Chức danh thành viên có chữ "Content" (VD: "Nhân viên Content"
--    → "Nhân viên Thương hiệu")
update public.profiles
set title = regexp_replace(title, 'content', 'Thương hiệu', 'gi')
where title ilike '%content%';

-- Kiểm tra kết quả
select name, description from public.teams order by name;
select name, title from public.profiles where title <> '' order by name;
