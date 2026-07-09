export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  // template.tsx được mount lại mỗi lần chuyển trang → chạy hiệu ứng vào trang
  return <div className="page-enter">{children}</div>;
}
