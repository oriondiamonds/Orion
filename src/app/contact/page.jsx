import { FiMail, FiPhone, FiInstagram } from "react-icons/fi";

export const metadata = {
  title: "Contact Us",
  description:
    "Get in touch with Orion Diamonds. Call, WhatsApp, or email us for product queries, customisation requests, or order support.",
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "JewelryStore",
  name: "Orion Diamonds",
  url: "https://www.oriondiamonds.in",
  telephone: "+91-7022253092",
  email: "info@oriondiamonds.in",
  priceRange: "₹₹₹",
  description:
    "Lab-grown diamond jewellery — rings, earrings, bracelets and pendants",
  sameAs: ["https://www.instagram.com/oriondiamonds.in"],
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />

      {/* Navy hero banner */}
      <div className="bg-[#0a1833] pt-40 pb-16 text-center">
        <p className="text-[#c9a84c] text-xs tracking-[4px] uppercase mb-3">
          Orion Diamonds
        </p>
        <h1 className="text-4xl md:text-5xl font-light text-white tracking-wide">
          Contact Us
        </h1>
        <p className="text-gray-400 mt-3 text-sm">
          We'd love to hear from you
        </p>
      </div>

      {/* Contact cards */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Email */}
          <div className="flex flex-col items-center text-center bg-gray-50 rounded-2xl p-8 gap-4">
            <div className="bg-[#0a1833] text-white rounded-full p-4">
              <FiMail size={24} />
            </div>
            <h3 className="font-semibold text-[#0a1833] text-lg">Email Us</h3>
            <p className="text-gray-500 text-sm">
              For queries, support, or customisation requests
            </p>
            <a
              href="mailto:info@oriondiamonds.in"
              className="text-[#c9a84c] font-medium hover:underline text-sm"
            >
              info@oriondiamonds.in
            </a>
          </div>

          {/* Phone / WhatsApp */}
          <div className="flex flex-col items-center text-center bg-gray-50 rounded-2xl p-8 gap-4">
            <div className="bg-[#0a1833] text-white rounded-full p-4">
              <FiPhone size={24} />
            </div>
            <h3 className="font-semibold text-[#0a1833] text-lg">
              Call / WhatsApp
            </h3>
            <p className="text-gray-500 text-sm">
              Available Mon–Sat, 10am – 7pm IST
            </p>
            <a
              href="tel:+917022253092"
              className="text-[#0a1833] font-medium text-sm"
            >
              +91 7022253092
            </a>
            <a
              href="https://wa.me/917022253092"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-500 text-white px-5 py-2 rounded-full hover:bg-green-600 transition text-sm font-medium"
            >
              Chat on WhatsApp
            </a>
          </div>

          {/* Instagram */}
          <div className="flex flex-col items-center text-center bg-gray-50 rounded-2xl p-8 gap-4">
            <div className="bg-[#0a1833] text-white rounded-full p-4">
              <FiInstagram size={24} />
            </div>
            <h3 className="font-semibold text-[#0a1833] text-lg">Instagram</h3>
            <p className="text-gray-500 text-sm">
              Follow us for new arrivals and behind-the-scenes
            </p>
            <a
              href="https://www.instagram.com/oriondiamonds.in?igsh=MWdqZW00ODczZ2tqNA%3D%3D&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#c9a84c] font-medium hover:underline text-sm"
            >
              @oriondiamonds.in
            </a>
          </div>

        </div>

        {/* Additional note */}
        <p className="text-center text-gray-400 text-sm mt-12">
          Response time is typically within a few hours on business days.
        </p>
      </div>
    </div>
  );
}
