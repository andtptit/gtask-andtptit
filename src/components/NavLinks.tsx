"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks({
  canSeeReports,
  isAdmin,
}: {
  canSeeReports: boolean;
  isAdmin: boolean;
}) {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Việc của tôi" },
    { href: "/board", label: "Kanban" },
    { href: "/tasks", label: "Danh sách" },
    { href: "/calendar", label: "Lịch" },
    ...(canSeeReports ? [{ href: "/reports", label: "Báo cáo" }] : []),
    { href: "/tasks/new", label: "+ Giao việc" },
    ...(isAdmin ? [{ href: "/admin", label: "Quản trị" }] : []),
  ];

  // Tab active = link có href là prefix dài nhất của pathname
  // (để /tasks/new không làm sáng cả tab "Danh sách")
  const active = links
    .filter((l) =>
      l.href === "/" ? pathname === "/" : pathname.startsWith(l.href)
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="flex items-center gap-1 text-sm">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-lg px-3 py-1.5 transition-colors ${
            active === l.href
              ? "bg-indigo-50 font-semibold text-indigo-700 hover:bg-indigo-100"
              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
