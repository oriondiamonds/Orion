import PolicyNav from "../PolicyNav";

export const metadata = {
  title: "Returns & Exchange Policy",
  description:
    "Orion Diamonds offers a 15-day return window, diamond buyback at 80% of prevailing market price, and 100% exchange on all lab-grown diamond jewellery.",
};

export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#0a1833] pt-40 pb-12 text-center">
        <p className="text-[#c9a84c] text-xs tracking-[4px] uppercase mb-3">
          Orion Diamonds
        </p>
        <h1 className="text-3xl md:text-4xl font-light text-white tracking-wide">
          Returns &amp; Exchange
        </h1>
        {/* <p className="text-gray-400 mt-2 text-sm">Effective: January 2026</p> */}
      </div>

      <PolicyNav />

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8 text-gray-700 leading-relaxed">

        <section>
          <h2 className="text-xl md:text-2xl font-black text-[#0a1833] mb-3">
            1. Return Window
          </h2>
          <p>
            We accept returns within <strong>15 days</strong> of the delivery
            date.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-black text-[#0a1833] mb-3">
            2. Buyback Policy
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Diamonds will be repurchased at <strong>80% of the prevailing
              market price</strong> of that particular diamond on the date of
              return, as determined by Orion Diamonds.
            </li>
            <li>
              Gold value will be calculated as per the prevailing gold rate on
              the date of return.
            </li>
            <li>
              All buybacks are subject to inspection, verification, and
              presentation of the original invoice.
            </li>
            <li>
              Orion Diamonds reserves the right to determine final valuation
              and amend this policy without prior notice.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-black text-[#0a1833] mb-3">
            3. 100% Exchange
          </h2>
          <p>
            Exchange your purchase for any other product of equal or higher
            value. The difference (if any) is payable at the time of exchange.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-black text-[#0a1833] mb-3">
            4. Conditions for Return / Exchange
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Item must be unworn and in original condition</li>
            <li>Original packaging must be intact</li>
            <li>Original invoice and certificate must be included</li>
            <li>Custom / personalised orders are non-returnable</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-black text-[#0a1833] mb-3">
            5. How to Initiate
          </h2>
          <p>
            Email{" "}
            <a
              href="mailto:info@oriondiamonds.in"
              className="text-[#c9a84c] hover:underline"
            >
              info@oriondiamonds.in
            </a>{" "}
            with the subject line:{" "}
            <span className="italic">
              "Return/Exchange — Order #[your order number]"
            </span>
            . Include photos of the item and your reason for return.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-black text-[#0a1833] mb-3">
            6. Refund Processing
          </h2>
          <p>
            Refunds are processed within <strong>7–10 business days</strong>{" "}
            after we receive and inspect the returned item.
          </p>
        </section>

      </div>
    </div>
  );
}
