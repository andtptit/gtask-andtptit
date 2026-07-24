"use client";

import { useFormStatus } from "react-dom";

// Spinner dùng chung cho mọi nút bấm đang xử lý (SubmitButton và các nút
// loading tự quản lý state riêng như ở trang Tài khoản).
export function Spinner({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

// Nút submit cho form server action: tự disable + báo "Đang xử lý…" khi pending
// (chống bấm đúp), và confirm trước khi submit nếu có confirmText.
export default function SubmitButton({
  children,
  className = "btn-primary",
  confirmText,
}: {
  children: React.ReactNode;
  className?: string;
  confirmText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={`${className} ${pending ? "pointer-events-none opacity-60" : ""}`}
      disabled={pending}
      onClick={
        confirmText
          ? (e) => {
              if (!window.confirm(confirmText)) e.preventDefault();
            }
          : undefined
      }
    >
      {pending && <Spinner />}
      {pending ? "Đang xử lý…" : children}
    </button>
  );
}
