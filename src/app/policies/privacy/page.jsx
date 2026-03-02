import PolicyNav from "../PolicyNav";

export const metadata = {
  title: "Privacy Policy",
  description:
    "Orion Diamonds privacy policy — how we collect, use, and protect your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#0a1833] pt-40 pb-12 text-center">
        <p className="text-[#c9a84c] text-xs tracking-[4px] uppercase mb-3">
          Orion Diamonds
        </p>
        <h1 className="text-3xl md:text-4xl font-light text-white tracking-wide">
          Privacy Policy
        </h1>
        {/* <p className="text-gray-400 mt-2 text-sm">Effective: January 2026</p> */}
      </div>

      <PolicyNav />

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8 text-gray-700 leading-relaxed">

        <section>
          <h2 className="text-xl md:text-2xl font-black text-[#0a1833] mb-3">
            1. Information We Collect
          </h2>
          <p className="mb-2">
            When you place an order or create an account, we collect:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Name, email address, phone number</li>
            <li>Shipping and billing address</li>
            <li>Order history and preferences</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-black text-[#0a1833] mb-3">
            2. How We Use Your Information
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To process and fulfil your orders</li>
            <li>
              To send order confirmations, shipping updates, and invoices
            </li>
            <li>To respond to customer service queries</li>
            <li>To improve our products and services</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-black text-[#0a1833] mb-3">
            3. Data Storage &amp; Security
          </h2>
          <p>
            Your data is stored securely (encrypted at rest and in transit). We
            do not store payment card details — all payments are processed by{" "}
            <strong>Razorpay</strong>, which is PCI-DSS Level 1 certified.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-black text-[#0a1833] mb-3">
            4. Data Sharing
          </h2>
          <p className="mb-2">
            We do not sell, rent, or share your personal information with third
            parties for marketing purposes. We may share data with:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Shipping partners (name + address only, for delivery)</li>
            <li>Razorpay (for payment processing)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-black text-[#0a1833] mb-3">
            5. Cookies
          </h2>
          <p>
            Our website uses cookies to maintain your session and cart. No
            third-party advertising cookies are used.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-black text-[#0a1833] mb-3">
            6. Your Rights
          </h2>
          <p>
            You may request access to, correction of, or deletion of your
            personal data by emailing{" "}
            <a
              href="mailto:info@oriondiamonds.in"
              className="text-[#c9a84c] hover:underline"
            >
              info@oriondiamonds.in
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-black text-[#0a1833] mb-3">
            7. Changes to This Policy
          </h2>
          <p>
            We may update this policy periodically. The effective date above
            reflects the most recent revision.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-black text-[#0a1833] mb-3">
            8. Contact
          </h2>
          <p>
            For privacy-related queries:{" "}
            <a
              href="mailto:info@oriondiamonds.in"
              className="text-[#c9a84c] hover:underline"
            >
              info@oriondiamonds.in
            </a>{" "}
            · +91 7022253092
          </p>
        </section>

      </div>
    </div>
  );
}
