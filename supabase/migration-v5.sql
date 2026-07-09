-- ============================================================
-- GTask v5 — Bật realtime cho thông báo (chạy SAU migration-v4-perf.sql)
-- Chuông thông báo tự cập nhật khi có thông báo mới
-- ============================================================

alter publication supabase_realtime add table public.notifications;
