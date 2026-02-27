"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/policies/returns", label: "Returns & Exchange" },
  { href: "/policies/shipping", label: "Shipping" },
  { href: "/policies/privacy", label: "Privacy" },
  { href: "/policies/terms", label: "Terms of Service" },
];

export default function PolicyNav() {
  const pathname = usePathname();
  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="max-w-3xl mx-auto px-4 py-3 flex gap-6 text-sm overflow-x-auto">
        {LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap transition ${
              pathname === href
                ? "text-[#0a1833] font-semibold border-b-2 border-[#c9a84c] pb-1"
                : "text-gray-500 hover:text-[#0a1833]"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
