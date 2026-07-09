"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { markAllRead, markRead } from "@/app/actions/notifications";
import { fmtDateTime } from "@/lib/constants";
import type { Notification } from "@/lib/types";

export default function NotificationBell({
  userId,
  notifications,
}: {
  userId: string;
  notifications: Notification[];
}) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const unread = notifications.filter((n) => !n.is_read).length;

  // Đóng khi click ra ngoài
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Realtime: có thông báo mới → refresh (cần migration-v5 bật realtime cho bảng notifications)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => router.refresh(), 400);
        }
      )
      .subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  function openNotification(n: Notification) {
    setOpen(false);
    if (!n.is_read) startTransition(() => markRead(n.id));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center rounded-lg px-2 py-1.5 hover:bg-gray-100"
        title="Thông báo"
      >
        <span>🔔</span>
        {unread > 0 && (
          <span className="ml-1 rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-sm font-semibold">Thông báo</span>
            {unread > 0 && (
              <form action={markAllRead}>
                <button className="text-xs text-indigo-600 hover:underline">
                  Đánh dấu đã đọc
                </button>
              </form>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-2 py-4 text-center text-sm text-gray-400">
                Chưa có thông báo
              </p>
            )}
            {notifications.map((n) => (
              <Link
                key={n.id}
                href={n.task_id ? `/tasks/${n.task_id}` : "/"}
                onClick={() => openNotification(n)}
                className={`block rounded-lg px-2 py-2 text-sm hover:bg-gray-50 ${
                  n.is_read ? "text-gray-500" : "font-medium"
                }`}
              >
                {n.content}
                <span className="block text-xs font-normal text-gray-400">
                  {fmtDateTime(n.created_at)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
