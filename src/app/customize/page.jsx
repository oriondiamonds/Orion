import CustomizeForm from "./CustomizeForm";

export const metadata = {
  title: "Custom Diamond Jewellery",
  description:
    "Design your own lab-grown diamond ring, necklace, bracelet or earrings with Orion Diamonds. Submit your customisation request and our experts will bring your vision to life.",
};

export default function CustomizePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navy hero banner */}
      <div className="bg-[#0a1833] pt-40 pb-16 text-center">
        <p className="text-[#c9a84c] text-xs tracking-[4px] uppercase mb-3">
          Orion Diamonds
        </p>
        <h1 className="text-4xl md:text-5xl font-light text-white tracking-wide">
          Customise Your Jewellery
        </h1>
        <p className="text-gray-400 mt-3 text-sm">
          Crafted to perfection — your design, our expertise
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <CustomizeForm />
      </div>
    </div>
  );
}
