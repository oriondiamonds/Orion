import PolicyNav from "../PolicyNav";

export const metadata = {
  title: "Shipping Policy",
  description:
    "Free shipping and insurance on all Orion Diamonds orders across India. Dispatch within 7–15 business days with full tracking.",
};

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#0a1833] pt-40 pb-12 text-center">
        <p className="text-[#c9a84c] text-xs tracking-[4px] uppercase mb-3">
          Orion Diamonds
        </p>
        <h1 className="text-3xl md:text-4xl font-light text-white tracking-wide">
          Shipping Policy
        </h1>
        <p className="text-gray-400 mt-2 text-sm">Effective: January 2026</p>
      </div>

      <PolicyNav />

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8 text-gray-700 leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold text-[#0a1833] mb-2">
            1. Free Shipping
          </h2>
          <p>
            All orders include <strong>free shipping and full insurance</strong>{" "}
            across India. No minimum order value required.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0a1833] mb-2">
            2. Dispatch Timeline
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Standard pieces:</strong> 7–15 business days from order
              confirmation
            </li>
            <li>
              <strong>Custom / personalised pieces:</strong> 15–25 business days
            </li>
          </ul>
          <p className="mt-2">
            Timeline begins after payment is confirmed.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0a1833] mb-2">
            3. Shipping Insurance
          </h2>
          <p>
            Every order is <strong>fully insured</strong> for its invoice value
            during transit. In the unlikely event of loss or damage, we will
            replace or refund the order at no additional cost.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0a1833] mb-2">
            4. Tracking
          </h2>
          <p>
            Once your order is dispatched, you will receive a tracking number
            via <strong>email and WhatsApp</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0a1833] mb-2">
            5. Coverage
          </h2>
          <p>
            We deliver to <strong>all pin codes across India</strong>.
            International shipping is currently unavailable.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0a1833] mb-2">
            6. Delays
          </h2>
          <p>
            Delivery timelines may be extended during festivals, national
            holidays, or unforeseen events. We will communicate any delays
            proactively.
          </p>
        </section>

      </div>
    </div>
  );
}
