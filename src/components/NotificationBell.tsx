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
  const [toasts, setToasts] = useState<Notification[]>([]);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const unread = notifications.filter((n) => !n.is_read).length;

  function dismissToast(id: string) {
    setToasts((t) => t.filter((x) => x.id !== id));
  }

  function pushToast(n: Notification) {
    setToasts((t) => [...t.slice(-3), n]); // tối đa 4 toast cùng lúc
    setTimeout(() => dismissToast(n.id), 6000);
  }

  // Xin quyền browser notification (hiện thông báo khi đang ở tab/app khác)
  useEffect(() => {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      const t = setTimeout(() => {
        Notification.requestPermission().catch(() => {});
      }, 3000);
      return () => clearTimeout(t);
    }
  }, []);

  // Đóng khi click ra ngoài
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Realtime: có thông báo mới → toast + browser notification + refresh
  // (cần migration-v5/v9 bật realtime cho bảng notifications)
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    // QUAN TRỌNG: phải nạp session và setAuth TRƯỚC khi subscribe —
    // nếu không, socket bị RLS coi là anonymous và không nhận được event nào
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) supabase.realtime.setAuth(session.access_token);
      if (cancelled) return;

      channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as Notification;

          // 1. Toast banner góc phải màn hình (khi đang mở app)
          pushToast(n);

          // 2. Browser notification (khi đang ở tab/cửa sổ khác)
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted" &&
            (document.hidden || !document.hasFocus())
          ) {
            const bn = new Notification("GTask — Thông báo mới", {
              body: n.content,
              tag: n.id,
            });
            bn.onclick = () => {
              window.focus();
              window.location.href = n.task_id ? `/tasks/${n.task_id}` : "/";
            };
          }

          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => router.refresh(), 400);
        }
      )
      .subscribe((status) => {
        // Mở DevTools Console để chẩn đoán: phải thấy "SUBSCRIBED"
        console.log("[GTask] notifications realtime:", status);
      });
    })();

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, router]);

  function openNotification(n: Notification) {
    setOpen(false);
    if (!n.is_read) startTransition(() => markRead(n.id));
  }

  return (
    <div className="relative" ref={ref}>
      {/* Toast banner góc phải màn hình */}
      {toasts.length > 0 && (
        <div className="fixed right-4 top-16 z-50 flex w-80 max-w-[90vw] flex-col gap-2">
          {toasts.map((t) => (
            <Link
              key={t.id}
              href={t.task_id ? `/tasks/${t.task_id}` : "/"}
              onClick={() => {
                dismissToast(t.id);
                startTransition(() => markRead(t.id));
              }}
              className="toast-enter flex items-start gap-2 rounded-xl border border-indigo-200 bg-white p-3 shadow-xl transition-colors hover:border-indigo-400 hover:bg-indigo-50"
            >
              <span className="shrink-0">🔔</span>
              <span className="min-w-0 flex-1 text-sm leading-snug text-gray-800">
                {t.content}
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dismissToast(t.id);
                }}
                className="shrink-0 text-gray-400 hover:text-gray-600"
                title="Đóng"
              >
                ✕
              </button>
            </Link>
          ))}
        </div>
      )}
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
