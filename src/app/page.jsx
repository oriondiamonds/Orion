"use client";

import { useState, useEffect } from "react";
import { FiMenu } from "react-icons/fi";
import { useRouter } from "next/navigation";
import Image from "next/image";
import OurPromise from "../components/promise";
import { ChevronUp, ChevronDown } from "lucide-react";

export default function Landing() {
  const [activeAccordion, setActiveAccordion] = useState(null);
  const router = useRouter();
  const [openCare, setOpenCare] = useState(false);
  const toggleAccordion = (section) => {
    setActiveAccordion(activeAccordion === section ? null : section);
  };
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    itemType: "",
    message: "",
    image: null, // NEW FIELD
    imagePreview: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        image: file,
        imagePreview: reader.result,
      }));
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.phone) {
      alert("Phone number is mandatory");
      return;
    }

    const form = new FormData();
    form.append("name", formData.name);
    form.append("email", formData.email);
    form.append("phone", formData.phone);
    form.append("itemType", formData.itemType);
    form.append("message", formData.message);

    if (formData.image) {
      form.append("image", formData.image);
    }

    const res = await fetch("/api/sendCustomization", {
      method: "POST",
      body: form,
    });

    if (res.ok) {
      alert("Your customization request has been sent successfully!");
      setFormData({
        name: "",
        email: "",
        phone: "",
        itemType: "",
        message: "",
        image: null,
        imagePreview: "",
      });
    } else {
      alert("Failed to send. Try again.");
    }
  };

  const [currentIndex, setCurrentIndex] = useState(0);
  const mobileImages = ["/newhero.jpg", "/hero2.jpg"];
  const desktopImages = ["/newhero.jpg", "/hero3.jpg"];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % 2);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div id="hero" className="min-h-screen text-gray-900 antialiased">
      {/* Hero Section */}
      <header
        id="main-content"
        className="relative min-h-screen overflow-hidden bg-[#0a1833]"
      >
        {/* --- MOBILE VERSION --- */}
        <div className="flex sm:hidden relative items-center justify-center min-h-screen w-full">
          {/* FULLSCREEN MODE for slide 2 (hero2.png) */}
          {currentIndex === 1 ? (
            <>
              <Image
                src="/mobcust.jpg"
                alt="Customization"
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />

              <div className="absolute inset-0 bg-black/40"></div>

              {/* CUSTOMIZE BUTTON ON MOBILE HERO2 */}
              <button
                onClick={() => router.push("#customizations")}
                className="absolute bottom-16 z-20 bg-white/80 text-[#0a1833] px-6 py-3 rounded-full font-semibold backdrop-blur-md shadow-lg"
              >
                Customize Now
              </button>
            </>
          ) : (
            <>
              {/* Normal mode for newhero.jpg */}
              <Image
                src="/newhero.jpg"
                alt="Orion Diamonds"
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />

              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black/40"></div>

              {/* Text Section */}
              <div
                className="relative z-10 max-w-4xl text-center px-6"
                style={{ transform: "translateY(-2.5rem)" }}
              >
                <h1 className="text-5xl mt-70 pt-20 font-serif font-semibold leading-tight text-white">
                  Orion Diamonds
                </h1>
                <p className="mt-15 pt-20 text-lg max-w-2xl mx-auto text-white">
                  Lab-grown diamonds inspired by the celestial brilliance of the
                  Orion constellation.
                </p>
              </div>
            </>
          )}
        </div>

        {/* --- DESKTOP VERSION --- */}
        <div className="hidden sm:flex relative min-h-screen w-full ">
          {/* If current slide is hero3 → fullscreen mode */}
          {currentIndex === 1 ? (
            <>
              <Image
                src="/descust.jpg"
                alt="Customization"
                fill
                priority
                sizes="100vw"
                className="object-cover object-center md:object-[50%_15%]"
              />

              <div className="absolute inset-0 bg-black/40"></div>

              {/* CUSTOMIZE BUTTON ON DESKTOP HERO3 */}
              <button
                onClick={() => router.push("#customizations")}
                className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 bg-white/85 text-[#0a1833] px-8 py-4 rounded-full text-xl font-semibold backdrop-blur-md shadow-lg hover:bg-white"
              >
                Customize Now
              </button>
            </>
          ) : (
            <>
              {/* LEFT SIDE TEXT */}
              <div className="z-20 w-1/2 flex flex-col object-left items-start text-left px-16 lg:px-24 lg:py-45">
                <h1 className="text-6xl md:text-7xl font-serif font-semibold leading-tight text-white">
                  Orion Diamonds
                </h1>
                <p className="mt-6 text-xl max-w-xl text-white">
                  Lab-grown diamonds inspired by the celestial brilliance of the
                  Orion constellation.
                </p>
              </div>

              {/* RIGHT SIDE IMAGE */}
              <div className="relative w-1/2 h-screen overflow-hidden">
                <Image
                  src="/newhero.jpg"
                  alt="Orion Diamonds"
                  fill
                  priority
                  sizes="50vw"
                  className="object-cover object-right sm:rounded-l-4xl"
                />
                <div className="absolute inset-y-0 left-0 w-32 bg-linear-to-r from-[#0a1833] to-transparent pointer-events-none"></div>
              </div>
            </>
          )}
        </div>

        {/* Carousel Indicators */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex gap-2 z-30">
          {[0, 1].map((index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-white w-8"
                  : "bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </header>

      {/* Collections Section */}
      <section id="collections" className="py-16 px-6 md:px-16 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-semibold mb-8 text-[#0a1833]">
            Collections
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: "Rings", img: "/rings.jpg", link: "/rings" },
              { name: "Earrings", img: "/earrings.jpeg", link: "/earrings" },
              { name: "Bracelets", img: "/bracelets.jpg", link: "/bracelets" },
              { name: "Pendants", img: "/necklaces.png", link: "/pendants" },
            ].map((item, i) => (
              <div
                key={i}
                className="relative h-110 rounded-2xl overflow-hidden shadow-lg group cursor-pointer"
                onClick={() => router.push(item.link)}
              >
                <Image
                  src={item.img}
                  alt={item.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Mobile title (always visible) */}
                <div className="absolute top-3 left-3 w-fit bg-[#808080]/60 text-white px-3 py-1 rounded-full text-xl font-medium md:hidden">
                  {item.name}
                </div>

                {/* Hover overlay for larger screens */}
                <div className="absolute inset-0 bg-black/40 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <h3 className="text-2xl font-bold text-white">{item.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Customizations */}
      <section id="customizations" className="py-16 px-6 md:px-16 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-semibold mb-8 text-[#0a1833]">
            Customization - Bring your vision to life with us
          </h2>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Left: Form Section */}
            <div className="bg-white shadow-lg rounded-2xl p-8 w-full md:flex-1">
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-[#0a1833] mb-2 font-medium">
                    First & Last Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#0a1833]"
                  />
                </div>

                <div>
                  <label className="block text-[#0a1833] mb-2 font-medium">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#0a1833]"
                  />
                </div>

                <div>
                  <label className="block text-[#0a1833] mb-2 font-medium">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#0a1833]"
                  />
                </div>

                <div>
                  <label className="block text-[#0a1833] mb-2 font-medium">
                    Item Type
                  </label>
                  <select
                    name="itemType"
                    value={formData.itemType}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#0a1833]"
                  >
                    <option value="">Select an item</option>
                    <option value="Ring">Ring</option>
                    <option value="Necklace / Pendant">
                      Necklace / Pendant
                    </option>
                    <option value="Earrings">Earrings</option>
                    <option value="Bracelet">Bracelet</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#0a1833] mb-2 font-medium">
                    Message
                  </label>
                  <textarea
                    name="message"
                    rows="4"
                    placeholder="Describe your customization idea..."
                    value={formData.message}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#0a1833]"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-[#0a1833] mb-2 font-medium">
                    Upload Image (Optional)
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#0a1833]"
                  />

                  {formData.imagePreview && (
                    <img
                      src={formData.imagePreview}
                      alt="Preview"
                      className="mt-3 h-32 rounded-lg object-cover shadow"
                    />
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#0a1833]  text-white py-3 rounded-lg hover:bg-[#142850] transition"
                >
                  SUBMIT
                </button>
              </form>
            </div>

            {/* Right: Image Section */}
            <div className="relative w-full md:flex-1 rounded-2xl shadow-md overflow-hidden" style={{ aspectRatio: "1/1" }}>
              <Image
                src="/cust.png"
                alt="Customization"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="text-center mt-12 text-[#0a1833]">
            <p className="text-lg">
              If you'd like to reach out directly, you can contact us at{" "}
              <strong>
                <a href="mailto:info@oriondiamonds.in" className="underline">
                  info@oriondiamonds.in
                </a>
              </strong>{" "}
              or call us on{" "}
              <strong>
                {" "}
                <a href="tel:+917022253092" className="underline">
                  +91 7022253092
                </a>
              </strong>
              .
            </p>
          </div>
        </div>
      </section>

      {/* About Section */}
      {/* <section id="about" className="py-16 px-6 md:px-16 lg:px-24 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          
          <h2 className="text-4xl font-semibold mb-8">About Orion Diamonds</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            <div className="relative w-full rounded-xl shadow-lg overflow-hidden" style={{ aspectRatio: "1001/795" }}>
              <Image
                src="/aboutus.png"
                alt="About Orion Diamonds"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>

            <div className="space-y-6 text-lg leading-relaxed">
              <p>
                At <span className="font-semibold">Orion</span>, our story began
                with a simple yet defining moment – the search for the perfect
                engagement ring. What should have been a joyful experience
                turned into a journey of uncertainty and unanswered questions.
              </p>

              <p>
                That moment inspired our vision: to make diamond shopping
                effortless, transparent, and meaningful. Founded and led by a
                young female entrepreneur and certified Diamond Graduate, Orion
                is built on expertise, integrity, and a deep passion for
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
      </section> */}

      {/* Promise Section */}
      <OurPromise />

      {/* Learn Section */}
      {/* <section id="learn" className="py-16 px-6 md:px-16 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-semibold mb-6 text-[#0a1833]">
            The Orion Difference
          </h2>
          <p className="text-[#0a1833] mb-6">Lab grown vs Natural Diamonds</p>

          <button
            onClick={() => setOpen(!open)}
            className="flex items-center justify-between w-full bg-[#0a1833] text-white px-6 py-4 rounded-lg text-lg font-medium focus:outline-none transition-all duration-200 hover:bg-[#13254d]"
          >
            <span>View Full Comparison</span>
            {open ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
          </button>

          {open && (
            <div className="mt-6 overflow-x-auto transition-all duration-300">
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
                      A true diamond. Made of 100% crystallized carbon, sharing
                      the exact same chemical, physical, and optical properties
                      as their mined counterparts.
                    </td>
                    <td className="p-4">
                      A true diamond. Also 100% carbon, formed deep underground.
                    </td>
                  </tr>
                  <tr className="border-t bg-gray-50">
                    <td className="p-4 font-semibold">The Brilliance</td>
                    <td className="p-4">
                      Identical. They have the same fire, scintillation, and
                      shine. They are just as hard and durable (10 on the Mohs
                      scale) for a lifetime of wear.
                    </td>
                    <td className="p-4">
                      Identical. They display the same stunning visual
                      qualities.
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-4 font-semibold">The Story (Origin)</td>
                    <td className="p-4">
                      Born of Innovation. Grown in a modern, controlled lab
                      environment using advanced technology that mimics the
                      Earth's natural process.
                    </td>
                    <td className="p-4">
                      Born of the Earth. Formed by immense heat and pressure
                      over billions of years.
                    </td>
                  </tr>
                  <tr className="border-t bg-gray-50">
                    <td className="p-4 font-semibold">The Price</td>
                    <td className="p-4">
                      Smarter Value. Because the production chain is efficient,
                      you get a much larger or higher-quality diamond for your
                      budget.
                    </td>
                    <td className="p-4">
                      Premium Cost. Prices are higher due to the significant
                      expenses of complex mining operations and perceived
                      rarity.
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-4 font-semibold">The Ethics</td>
                    <td className="p-4">
                      Guaranteed Conflict-Free. Every stone is fully traceable
                      from its origin in the lab directly to you. No ethical
                      ambiguity.
                    </td>
                    <td className="p-4">
                      Sourcing requires checks (like the Kimberley Process) to
                      ensure stones are conflict-free.
                    </td>
                  </tr>
                  <tr className="border-t bg-gray-50">
                    <td className="p-4 font-semibold">The Environment</td>
                    <td className="p-4">
                      A Responsible Choice. Production avoids the large-scale
                      land disruption, ecological damage, and excessive energy
                      and water use of mining.
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
                      IGI) on the same 4Cs. They are inscribed as "LAB GROWN"
                      for complete transparency.
                    </td>
                    <td className="p-4">
                      Fully Certified and graded on the same 4Cs.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-10 bg-white text-[#0a1833] p-8 md:p-10 rounded-2xl shadow-xl">
            <h3 className="text-3xl font-semibold mb-4">
              The Orion Promise: Brilliance Without Compromise
            </h3>
            <p className="text-lg leading-relaxed">
              At Orion Diamonds, the choice between lab-grown and mined is no
              longer about quality – it's about values. Our diamonds deliver the
              same fire, brilliance, and lasting beauty as mined ones, with an
              origin you can feel proud of – offering smarter value, a clear
              conscience, and zero compromise.
            </p>
          </div>
        </div>
      </section> */}

      {/* Taking Care */}
      <section id="care" className="py-16 px-6 md:px-16 lg:px-24 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* Full-width heading and intro */}
          <div className="mb-10 text-[#0a1833]">
            <h2 className="text-4xl font-semibold mb-6">
              The Orion Care Guide: Keep the Sparkle Alive
            </h2>
            <p className="text-lg leading-relaxed">
              Even the most brilliant diamond can lose its sparkle over time as
              oils, lotions, and dust settle on its surface. The good news? You
              can easily bring back that "just-bought" shine right at home –
              with gentle care and a few simple steps.
            </p>
          </div>

          {/* Dropdown Button */}
          <button
            onClick={() => setOpenCare(!openCare)}
            className="flex items-center justify-between w-full bg-[#0a1833] text-white px-6 py-4 rounded-lg text-lg font-medium focus:outline-none transition-all duration-200 hover:bg-[#13254d]"
          >
            <span>View Care Instructions</span>
            {openCare ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
          </button>

          {/* Dropdown Content */}
          {openCare && (
            <div className="mt-6 transition-all duration-300">
              {/* Two-column section for points and image */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                {/* Left Side - Care Steps */}
                <div className="text-[#0a1833] space-y-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">
                      1. Clean with Care
                    </h3>
                    <p>
                      Soak your piece in warm, soapy water for a few minutes and
                      gently brush with a soft toothbrush.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-1">
                      2. Rinse & Dry
                    </h3>
                    <p>
                      Rinse under clean water and dry with a soft, lint-free
                      cloth.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-1">
                      3. Avoid Harsh Chemicals
                    </h3>
                    <p>
                      Keep your jewellery away from bleach, acetone, and
                      abrasive cleaners.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-1">
                      4. Handle Gently
                    </h3>
                    <p>
                      Hold by the band or edges to maintain the diamond's
                      brilliance.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-1">
                      5. Professional Care
                    </h3>
                    <p>
                      A professional cleaning once or twice a year keeps your
                      diamonds secure and radiant.
                    </p>
                  </div>
                </div>

                {/* Right Side - Image */}
                <div className="relative w-full rounded-2xl shadow-lg overflow-hidden" style={{ aspectRatio: "1/1" }}>
                  <Image
                    src="/care.png"
                    alt="Diamond Care"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Full-width Orion Tip */}
              <div className="mt-10 bg-white text-[#0a1833] p-8 rounded-2xl shadow-xl">
                <h3 className="text-2xl font-semibold mb-2">Orion Tip:</h3>
                <p className="text-lg leading-relaxed">
                  Store your diamond pieces separately in soft pouches or lined
                  boxes to prevent scratches – and let your brilliance shine,
                  every day.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      

      {/* Accordion Sections */}
      {/* <section id="faqs" className="py-16 px-6 md:px-16 lg:px-24 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-semibold mb-8 text-[#0a1833]">
            Frequently Asked Questions
          </h2>
          {[
            {
              title: "What are lab-grown diamonds?",
              content: (
                <p className="text-[#0a1833]">
                  Lab-grown diamonds are real diamonds created in a lab using
                  advanced technology. They have the same physical, chemical,
                  and optical properties as mined diamonds.
                </p>
              ),
            },
            {
              title: "Are lab-grown diamonds real diamonds?",
              content: (
                <p className="text-[#0a1833]">
                  Yes, lab-grown diamonds are 100% real. They are certified and
                  graded just like mined diamonds.
                </p>
              ),
            },
            {
              title: "How are lab-grown diamonds made?",
              content: (
                <p className="text-[#0a1833]">
                  They are made using two methods: HPHT (High Pressure High
                  Temperature) or CVD (Chemical Vapor Deposition), replicating
                  the natural diamond-growing process. We prefer and use the CVD
                  method.
                </p>
              ),
            },
            {
              title:
                "Do lab-grown diamonds look different from natural diamonds?",
              content: (
                <p className="text-[#0a1833]">
                  Lab-grown diamonds do not hold resale value like mined
                  diamonds. They're ideal for value-conscious buyers who
                  prioritize ethics and aesthetics.
                </p>
              ),
            },
            {
              title: "Will a lab-grown diamond last forever?",
              content: (
                <p className="text-[#0a1833]">
                  Yes. Just like mined diamonds, they are extremely durable and
                  will last a lifetime.
                </p>
              ),
            },
            {
              title: "Why should I choose lab-grown over natural diamonds?",
              content: (
                <p className="text-[#0a1833]">
                  Lab-grown diamonds offer the same beauty at a better price,
                  with ethical sourcing and lower environmental impact.
                </p>
              ),
            },
            {
              title: "Can I customise lab-grown diamond jewellery?",
              content: (
                <p className="text-[#0a1833]">
                  Absolutely. At Orion, we craft each piece to match your vision
                  – from rings to earrings, every design is tailored to your
                  style and preferences.
                </p>
              ),
            },
            {
              title: "Can lab-grown diamonds be certified?",
              content: (
                <p className="text-[#0a1833]">
                  Absolutely. They are certified by reputable labs like IGI,
                  GIA, or SGL, just like mined diamonds.
                </p>
              ),
            },
          ].map((section, idx) => (
            <div key={idx} className="border-b">
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-left text-[#0a1833] font-bold hover:bg-[#0a1833]/10"
                onClick={() => toggleAccordion(idx)}
              >
                {section.title}
                <FiMenu />
              </button>
              {activeAccordion === idx && (
                <div className="px-6 py-6 text-[#0a1833]">
                  {section.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </section> */}
    </div>
  );
}
