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
  title: "Orion Diamonds",
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
          className="fixed bottom-4 md:bottom-6 right-4 flex items-center justify-center gap-1 bg-[#064f46] text-white px-4 py-2 md:px-5 md:py-3 lg:px-5 lg:py-3 rounded-full text-lg font-semibold shadow-lg hover:bg-green-600 hover:scale-105 transition-all duration-300"
        >
          <FaWhatsapp className=" w-4 h-4 md:w-5 md:h-5 lg:w-5 lg:h-5" />
          <span className="text-base md:text-lg lg:text-lg">
            Let us help you out
          </span>
        </a>
        <Footer />
      </body>
    </html>
  );
}
