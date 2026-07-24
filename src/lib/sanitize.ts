import sanitizeHtmlLib from "sanitize-html";

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

// Làm sạch HTML do người dùng nhập (mô tả/brief) trước khi render bằng
// dangerouslySetInnerHTML — chặn XSS (script, onerror, javascript: link...).
// Dùng sanitize-html (thuần JS, không phụ thuộc jsdom) thay vì
// isomorphic-dompurify — jsdom hay bị thiếu file khi trace bundle serverless
// (chạy local bình thường nhưng lỗi 500 khi deploy Vercel).
export function sanitizeHtml(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href", "target", "rel"] },
  });
}

// Dùng cho các chỗ chỉ cần xem trước dạng text thuần (card, popover, tooltip)
// — render qua React (tự escape), không dùng dangerouslySetInnerHTML, nên chỉ
// cần bóc thẻ để dễ đọc chứ không cần sanitize an toàn tuyệt đối.
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
