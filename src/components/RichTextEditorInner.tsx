"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`min-w-[28px] rounded px-1.5 py-1 text-sm font-semibold hover:bg-gray-200 ${
        active ? "bg-indigo-100 text-indigo-700" : "text-gray-600"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Nhập URL liên kết:", prev || "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-300 bg-gray-50 px-1.5 py-1">
      <ToolbarButton
        label="Đậm (Ctrl+B)"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </ToolbarButton>
      <ToolbarButton
        label="Nghiêng (Ctrl+I)"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton
        label="Gạch ngang"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <span className="line-through">S</span>
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-gray-300" />
      <ToolbarButton
        label="Danh sách gạch đầu dòng"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        ≡•
      </ToolbarButton>
      <ToolbarButton
        label="Danh sách đánh số"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        ≡1
      </ToolbarButton>
      <ToolbarButton
        label="Trích dẫn"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        &ldquo;&rdquo;
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-gray-300" />
      <ToolbarButton
        label="Chèn liên kết"
        active={editor.isActive("link")}
        onClick={setLink}
      >
        🔗
      </ToolbarButton>
    </div>
  );
}

// Ô nhập mô tả/brief dạng rich text (bold, italic, list, link...).
// Đồng bộ nội dung HTML vào 1 hidden input để form action (server action)
// đọc được bình thường qua formData.get(name) như 1 textarea thường.
export default function RichTextEditor({
  name,
  defaultValue = "",
  placeholder = "Nhập mô tả…",
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: defaultValue,
    editorProps: {
      attributes: {
        class: "rich-text min-h-[110px] max-h-96 overflow-y-auto px-3 py-2 text-sm focus:outline-none",
      },
    },
    // Tránh mismatch khi SSR trong Next.js App Router (editor cần DOM).
    immediatelyRender: false,
  });

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-indigo-500">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
      <input
        type="hidden"
        name={name}
        value={editor ? (editor.isEmpty ? "" : editor.getHTML()) : defaultValue}
        readOnly
      />
    </div>
  );
}
