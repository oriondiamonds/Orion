import PolicyNav from "../PolicyNav";

export const metadata = {
  title: "Terms of Service",
  description:
    "Terms and conditions for purchasing from Orion Diamonds — pricing, cancellation, custom orders, and governing law.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#0a1833] pt-40 pb-12 text-center">
        <p className="text-[#c9a84c] text-xs tracking-[4px] uppercase mb-3">
          Orion Diamonds
        </p>
        <h1 className="text-3xl md:text-4xl font-light text-white tracking-wide">
          Terms of Service
        </h1>
        <p className="text-gray-400 mt-2 text-sm">Effective: January 2026</p>
      </div>

      <PolicyNav />

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8 text-gray-700 leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold text-[#0a1833] mb-2">
            1. Acceptance
          </h2>
          <p>
            By placing an order on oriondiamonds.in, you agree to these terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0a1833] mb-2">
            2. Pricing
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              All prices are in Indian Rupees (₹) and inclusive of applicable
              taxes.
            </li>
            <li>
              Gold prices vary daily. The price shown at checkout is the final
              price.
            </li>
            <li>
              We reserve the right to update prices without prior notice.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0a1833] mb-2">
            3. Order Confirmation
          </h2>
          <p>
            An order is confirmed only after successful payment. You will
            receive a confirmation email with your order number.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0a1833] mb-2">
            4. Cancellation
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              You may cancel your order within <strong>24 hours</strong> of
              placement for a full refund.
            </li>
            <li>
              After 24 hours, cancellations are subject to our Returns Policy.
            </li>
            <li>
              Custom / personalised orders cannot be cancelled once production
              begins.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0a1833] mb-2">
            5. Product Descriptions
          </h2>
          <p>
            We make every effort to accurately describe our products, including
            metal type, diamond weight, and certifications. Minor variations in
            colour may occur due to screen settings.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0a1833] mb-2">
            6. Certification
          </h2>
          <p>
            All diamonds sold by Orion Diamonds are accompanied by{" "} authentic certification.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0a1833] mb-2">
            7. Limitation of Liability
          </h2>
          <p>
            Orion Diamonds is not liable for indirect, incidental, or
            consequential damages arising from the use of our products or
            services.
          </p>
        </section>


        <section>
          <h2 className="text-lg font-semibold text-[#0a1833] mb-2">
            8. Contact
          </h2>
          <p>
            For questions about these terms:{" "}
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
