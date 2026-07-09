"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addComment } from "@/app/actions/comments";

export default function CommentBox({
  taskId,
  users,
}: {
  taskId: string;
  users: { id: string; name: string }[];
}) {
  const [value, setValue] = useState("");
  const [suggest, setSuggest] = useState<{ id: string; name: string }[]>([]);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setValue(v);
    const caret = e.target.selectionStart || v.length;
    const before = v.slice(0, caret);
    const m = before.match(/@([^\s@]*)$/);
    if (m) {
      const q = m[1].toLowerCase();
      setSuggest(
        users.filter((u) => u.name.toLowerCase().includes(q)).slice(0, 5)
      );
    } else {
      setSuggest([]);
    }
  }

  function pick(name: string) {
    const el = inputRef.current;
    const caret = el?.selectionStart ?? value.length;
    const before = value.slice(0, caret).replace(/@([^\s@]*)$/, `@${name} `);
    setValue(before + value.slice(caret));
    setSuggest([]);
    el?.focus();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const content = value.trim();
    if (!content) return;
    const fd = new FormData();
    fd.set("task_id", taskId);
    fd.set("content", content);
    startTransition(async () => {
      await addComment(fd);
      setValue("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="relative mt-4">
      {suggest.length > 0 && (
        <div className="absolute bottom-full left-0 mb-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
          {suggest.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => pick(u.name)}
              className="block w-full px-3 py-1.5 text-left text-sm hover:bg-indigo-50"
            >
              @{u.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <textarea
          ref={inputRef}
          className="input"
          rows={2}
          placeholder="Viết bình luận... (gõ @ để nhắc đến ai đó)"
          value={value}
          onChange={handleChange}
          required
        />
        <button className="btn-primary shrink-0 self-end" disabled={isPending}>
          {isPending ? "..." : "Gửi"}
        </button>
      </div>
    </form>
  );
}
