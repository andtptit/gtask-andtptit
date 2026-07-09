"use client";

import { useFormStatus } from "react-dom";

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
      {pending ? "Đang xử lý…" : children}
    </button>
  );
}
