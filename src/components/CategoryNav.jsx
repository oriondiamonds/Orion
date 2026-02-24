"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const CATEGORIES = [
  { label: "Rings", href: "/rings" },
  { label: "Earrings", href: "/earrings" },
  { label: "Bracelets", href: "/bracelets" },
  { label: "Pendants", href: "/pendants" },
];

export default function CategoryNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-20 md:top-[120px] z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map(({ label, href }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`shrink-0 px-5 md:px-8 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-[#0a1833] text-[#0a1833]"
                    : "border-transparent text-gray-500 hover:text-[#0a1833] hover:border-gray-300"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
