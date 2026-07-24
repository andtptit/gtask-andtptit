import DOMPurify from "isomorphic-dompurify";

// Các thẻ/thuộc tính mà RichTextEditor (TipTap) có thể sinh ra.
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "s",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
];
const ALLOWED_ATTR = ["href", "target", "rel"];

// Làm sạch HTML do người dùng nhập (mô tả/brief) trước khi render bằng
// dangerouslySetInnerHTML — chặn XSS (script, onerror, javascript: link...).
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}

// Dùng cho các chỗ chỉ cần xem trước dạng text thuần (card, popover, tooltip).
export function stripHtml(html: string): string {
  return sanitizeHtml(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
