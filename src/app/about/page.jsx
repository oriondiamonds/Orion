import Image from "next/image";
import OurPromise from "../../components/promise.jsx";

export const metadata = {
  title: "About Us",
  description:
    "Learn about Orion Diamonds — founded by Dr. Vandana Jain, Certified Diamond Graduate. We craft exquisite lab-grown diamond jewellery that is ethical, affordable, and brilliant.",
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Orion Diamonds",
  url: "https://www.oriondiamonds.in",
  logo: "https://www.oriondiamonds.in/nobglogo.png",
  description: "Lab-grown diamond jewellery founded by Dr. Vandana Jain",
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+91-7022253092",
    contactType: "customer service",
    email: "info@oriondiamonds.in",
  },
  sameAs: ["https://www.instagram.com/oriondiamonds.in"],
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />

      {/* Navy hero banner */}
      <div className="bg-[#0a1833] pt-40 pb-16 text-center">
        <p className="text-[#c9a84c] text-xs tracking-[4px] uppercase mb-3">
          Orion Diamonds
        </p>
        <h1 className="text-4xl md:text-5xl font-light text-white tracking-wide">
          About Us
        </h1>
        <p className="text-gray-400 mt-3 text-sm">
          The story behind the star-inspired brand
        </p>
      </div>

      {/* Founder Story */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          {/* Image */}
          <div
            className="relative w-full rounded-xl shadow-lg overflow-hidden"
            style={{ aspectRatio: "1001/795" }}
          >
            <Image
              src="/aboutus.png"
              alt="About Orion Diamonds"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>

          {/* Text */}
          <div className="space-y-6 text-lg leading-relaxed text-gray-700">
            <p>
              At <span className="font-semibold text-[#0a1833]">Orion</span>,
              our story began with a simple yet defining moment – the search for
              the perfect engagement ring. What should have been a joyful
              experience turned into a journey of uncertainty and unanswered
              questions.
            </p>
            <p>
              That moment inspired our vision: to make diamond shopping
              effortless, transparent, and meaningful. Founded and led by a
              young female entrepreneur and certified Diamond Graduate, Orion is
              built on expertise, integrity, and a deep passion for
              craftsmanship.
            </p>
            <p>
              With a modern perspective and a genuine understanding of what
              today's buyers seek, we bring clarity, confidence, and care to
              every diamond journey. Each of our diamonds is hand-selected,
              ethically grown, and crafted to perfection – ensuring brilliance
              that reflects both light and emotion.
            </p>
            <p>
              More than just a jewellery brand, we are a trusted companion in
              celebrating life's most cherished moments – guiding you towards
              pieces that are timeless, personal, and truly yours.
            </p>
            <div className="text-right mt-8">
              <p className="text-[#b49c73] font-semibold">Founder</p>
              <p className="text-[#b49c73] font-semibold text-lg">
                – Dr. Vandana Jain
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Our Promise */}
      <OurPromise />

      {/* The Orion Difference */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-semibold mb-2 text-[#0a1833]">
          The Orion Difference
        </h2>
        <p className="text-gray-500 mb-8">Lab-Grown vs Natural Diamonds</p>

        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 rounded-xl overflow-hidden text-[#0a1833]">
            <thead className="bg-[#0a1833] text-white">
              <tr>
                <th className="p-4 text-left">Feature</th>
                <th className="p-4 text-left">
                  Lab-Grown Diamonds (The Orion Choice)
                </th>
                <th className="p-4 text-left">
                  Mined Diamonds (The Classic Choice)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              <tr className="border-t">
                <td className="p-4 font-semibold">What They Really Are</td>
                <td className="p-4">
                  A true diamond. Made of 100% crystallized carbon, sharing the
                  exact same chemical, physical, and optical properties as their
                  mined counterparts.
                </td>
                <td className="p-4">
                  A true diamond. Also 100% carbon, formed deep underground.
                </td>
              </tr>
              <tr className="border-t bg-gray-50">
                <td className="p-4 font-semibold">The Brilliance</td>
                <td className="p-4">
                  Identical. They have the same fire, scintillation, and shine.
                  They are just as hard and durable (10 on the Mohs scale) for a
                  lifetime of wear.
                </td>
                <td className="p-4">
                  Identical. They display the same stunning visual qualities.
                </td>
              </tr>
              <tr className="border-t">
                <td className="p-4 font-semibold">The Story (Origin)</td>
                <td className="p-4">
                  Born of Innovation. Grown in a modern, controlled lab
                  environment using advanced technology that mimics the Earth's
                  natural process.
                </td>
                <td className="p-4">
                  Born of the Earth. Formed by immense heat and pressure over
                  billions of years.
                </td>
              </tr>
              <tr className="border-t bg-gray-50">
                <td className="p-4 font-semibold">The Price</td>
                <td className="p-4">
                  Smarter Value. Because the production chain is efficient, you
                  get a much larger or higher-quality diamond for your budget.
                </td>
                <td className="p-4">
                  Premium Cost. Prices are higher due to the significant
                  expenses of complex mining operations and perceived rarity.
                </td>
              </tr>
              <tr className="border-t">
                <td className="p-4 font-semibold">The Ethics</td>
                <td className="p-4">
                  Guaranteed Conflict-Free. Every stone is fully traceable from
                  its origin in the lab directly to you. No ethical ambiguity.
                </td>
                <td className="p-4">
                  Sourcing requires checks (like the Kimberley Process) to
                  ensure stones are conflict-free.
                </td>
              </tr>
              <tr className="border-t bg-gray-50">
                <td className="p-4 font-semibold">The Environment</td>
                <td className="p-4">
                  A Responsible Choice. Production avoids the large-scale land
                  disruption, ecological damage, and excessive energy and water
                  use of mining.
                </td>
                <td className="p-4">
                  Requires digging and excavation, which carries a larger
                  environmental footprint.
                </td>
              </tr>
              <tr className="border-t">
                <td className="p-4 font-semibold">Certification</td>
                <td className="p-4">
                  Fully Certified. Graded by the same independent labs (GIA,
                  IGI) on the same 4Cs. Inscribed as "LAB GROWN" for complete
                  transparency.
                </td>
                <td className="p-4">
                  Fully Certified and graded on the same 4Cs.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
