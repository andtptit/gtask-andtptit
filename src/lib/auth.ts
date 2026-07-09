import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// React cache(): dedupe trong cùng 1 request — layout + page gọi chung
// nhưng chỉ chạm Supabase đúng 1 lần cho mỗi hàm.

export const getUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data as Profile | null;
});

export const getLeaderTeamIds = cache(async (): Promise<string[]> => {
  const user = await getUser();
  if (!user) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .eq("is_leader", true);
  return (data || []).map((r) => r.team_id as string);
});
