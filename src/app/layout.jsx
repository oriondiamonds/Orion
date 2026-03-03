import "./globals.css";
import { Suspense } from "react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import ScrollToTop from "../components/scrolltop";
import { Toaster } from "react-hot-toast";
import { Providers } from "./providers";
import { FaWhatsapp } from "react-icons/fa6";
import CartSyncProvider from "../components/CartSyncProvider";
import UtmVisitTracker from "../components/UtmVisitTracker";
import CouponCapture from "../components/CouponCapture";

export const metadata = {
  title: {
    default: "Orion Diamonds — Lab-Grown Diamond Jewellery",
    template: "%s — Orion Diamonds",
  },
  description:
    "Shop certified lab-grown diamond rings, earrings, bracelets and pendants. IGI-certified, ethically sourced, 80% buyback guarantee. Free shipping across India.",
  openGraph: {
    siteName: "Orion Diamonds",
    url: "https://www.oriondiamonds.in",
    type: "website",
    images: [
      {
        url: "https://www.oriondiamonds.in/nobglogo.png",
        width: 400,
        height: 100,
        alt: "Orion Diamonds",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: { index: true, follow: true },
  icons: {
    icon: "/icon.jpeg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ScrollToTop />
        <Navbar />
        <Toaster position="bottom-center" />

        <Providers>
          <UtmVisitTracker />
          <Suspense fallback={null}>
            <CouponCapture />
          </Suspense>
          <CartSyncProvider>{children}</CartSyncProvider>
        </Providers>

        <a
          href="https://wa.me/917022253092?text=Hi%20there!%20I%20need%20some%20help%20with%20a%20product%20on%20your%20website."
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Let us help you out on WhatsApp"
          className="group fixed bottom-4 md:bottom-6 right-4 z-30 flex items-center justify-center bg-[#064f46] text-white px-3 py-3 rounded-full text-lg font-semibold shadow-lg hover:bg-green-600 transition-all duration-300"
        >
          <FaWhatsapp className="w-5 h-5 md:w-5 md:h-5" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-base transition-all duration-300 group-hover:max-w-[220px] group-hover:ml-2">
            Let us help you out
          </span>
        </a>
        <Footer />
      </body>
    </html>
  );
}
