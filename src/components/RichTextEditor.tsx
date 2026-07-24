"use client";

import dynamic from "next/dynamic";

// TipTap/ProseMirror khá nặng (~150-180kB) — tách thành chunk riêng, chỉ tải
// khi component thực sự mount ở client, thay vì cộng thẳng vào bundle của
// trang chứa nó (trước đây làm /tasks/new và /tasks/[id] nặng gấp 2-3 lần
// các trang khác). ssr:false vì editor cần DOM, không cần render ở server.
const RichTextEditorInner = dynamic(() => import("./RichTextEditorInner"), {
  ssr: false,
  loading: () => (
    <div className="h-[146px] animate-pulse rounded-lg border border-gray-300 bg-gray-50" />
  ),
});

export default function RichTextEditor(props: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return <RichTextEditorInner {...props} />;
}
