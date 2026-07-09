import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client dùng service role key — CHỈ gọi từ server actions, không bao giờ đưa ra client.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Thiếu SUPABASE_SERVICE_ROLE_KEY trong biến môi trường (cần cho tính năng admin tạo thành viên)."
    );
  }
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
