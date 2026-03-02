import Link from "next/link";
import { FiMail, FiPhone, FiInstagram } from "react-icons/fi";

export function Footer() {
  return (
    <footer id="contact" className="bg-[#0a1833] text-white">

      {/* === 4-COLUMN GRID === */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">

          {/* Col 1 — Brand */}
          <div className="md:col-span-1">
            <img
              src="/nobglogo.png"
              alt="Orion Diamonds"
              className="w-36 mb-4"
            />
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Lab-grown diamonds inspired by the celestial brilliance of the Orion constellation.
            </p>
            <div className="flex flex-col gap-3 text-sm text-gray-300">
              <a
                href="mailto:info@oriondiamonds.in"
                className="flex items-center gap-2 hover:text-[#c9a84c] transition"
              >
                <FiMail size={15} />
                info@oriondiamonds.in
              </a>
              <a
                href="tel:+917022253092"
                className="flex items-center gap-2 hover:text-[#c9a84c] transition"
              >
                <FiPhone size={15} />
                +91 7022253092
              </a>
              <a
                href="https://www.instagram.com/oriondiamonds.in?igsh=MWdqZW00ODczZ2tqNA%3D%3D&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-[#c9a84c] transition"
              >
                <FiInstagram size={15} />
                @oriondiamonds.in
              </a>
            </div>
          </div>

          {/* Col 2 — Shop */}
          <div>
            <h3 className="text-[#c9a84c] text-md font-semibold tracking-[3px] uppercase mb-5">
              Shop
            </h3>
            <ul className="space-y-3 text-sm text-gray-300">
              <li><Link href="/rings" className="hover:text-white transition">Rings</Link></li>
              <li><Link href="/earrings" className="hover:text-white transition">Earrings</Link></li>
              <li><Link href="/bracelets" className="hover:text-white transition">Bracelets</Link></li>
              <li><Link href="/pendants" className="hover:text-white transition">Pendants</Link></li>
              <li><Link href="/customize" className="hover:text-white transition">Customize</Link></li>
            </ul>
          </div>

          {/* Col 3 — Company */}
          <div>
            <h3 className="text-[#c9a84c] text-md font-semibold tracking-[3px] uppercase mb-5">
              Company
            </h3>
            <ul className="space-y-3 text-sm text-gray-300">
              <li><Link href="/about" className="hover:text-white transition">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-white transition">Contact Us</Link></li>
              <li><Link href="/faqs" className="hover:text-white transition">FAQs</Link></li>
            </ul>
          </div>

          {/* Col 4 — Support */}
          <div>
            <h3 className="text-[#c9a84c] text-md font-semibold tracking-[3px] uppercase mb-5">
              Support
            </h3>
            <ul className="space-y-3 text-sm text-gray-300">
              <li><Link href="/policies/returns" className="hover:text-white transition">Returns & Exchange</Link></li>
              <li><Link href="/policies/shipping" className="hover:text-white transition">Shipping Policy</Link></li>
              <li><Link href="/policies/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
              <li><Link href="/policies/terms" className="hover:text-white transition">Terms of Service</Link></li>
            </ul>
          </div>

        </div>
      </div>

      {/* === BOTTOM BAR === */}
      <div className="border-t border-white/10 py-5 px-6 text-center">
        <p className="text-gray-500 text-xs tracking-wide">
          © {new Date().getFullYear()}{" "}
          <span className="text-gray-400 font-medium">Orion Diamonds</span>
          {" "}— All rights reserved.
        </p>
        <p className="text-[#c9a84c]/40 text-xs tracking-[2px] mt-1 uppercase">
          Lab-Grown · Certified · Ethically Sourced
        </p>
      </div>

    </footer>
  );
}
