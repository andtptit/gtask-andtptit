import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GTask — Giao việc phòng Marketing",
  description: "Phần mềm giao việc nội bộ phòng Marketing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
