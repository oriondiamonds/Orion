"use client";

import { useState, useEffect, useRef } from "react";
import { FiMenu } from "react-icons/fi";
import { useRouter } from "next/navigation";
import Image from "next/image";
import OurPromise from "../components/promise";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getBestSellers, getFeaturedProducts, getProductByHandle } from "../queries/products";
import { formatIndianCurrency } from "../utils/formatIndianCurrency";
import { computeItemPrice } from "../utils/computeItemPrice";
import { testimonials } from "../data/testimonials";

export default function Landing() {
  const [activeAccordion, setActiveAccordion] = useState(null);
  const router = useRouter();
  const [openCare, setOpenCare] = useState(false);
  const toggleAccordion = (section) => {
    setActiveAccordion(activeAccordion === section ? null : section);
  };
  const [open, setOpen] = useState(false);
  const [bestSellers, setBestSellers] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [livePrices, setLivePrices] = useState({});
  const bestSellersSliderRef = useRef(null);
  const featuredSliderRef = useRef(null);
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

  useEffect(() => {
    let mounted = true;

    async function loadCuratedProducts() {
      const [bestsellerData, featuredData] = await Promise.all([
        getBestSellers(8),
        getFeaturedProducts(8),
      ]);

      if (!mounted) return;
      setBestSellers(bestsellerData);
      setFeaturedProducts(featuredData);

      // Live price computation — shared cache with collection pages (same key/version)
      const CACHE_KEY = "orion_live_prices_v3";
      const TTL = 10 * 60 * 1000; // 10 minutes

      // Check pricing config version to detect stale cache
      let configVersion = null;
      try {
        const cfgRes = await fetch("/api/pricing-config", { cache: "no-store" });
        const cfg = await cfgRes.json();
        configVersion = cfg.lastUpdated || null;
      } catch {}

      let cached = null;
      try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch {}

      const configChanged = configVersion && cached?.configVersion !== configVersion;
      const timeStale = !cached || Date.now() - cached.timestamp >= TTL;

      const allProducts = [...bestsellerData, ...featuredData];
      const needsFetch = (timeStale || configChanged)
        ? allProducts
        : allProducts.filter(
            (p) => !cached.prices?.[`${p.handle}_10K`] || !cached.prices?.[`${p.handle}_14K`] || !cached.prices?.[`${p.handle}_18K`]
          );

      let prices = { ...(cached?.prices || {}) };

      if (needsFetch.length > 0) {
        await Promise.all(
          needsFetch.map(async (product) => {
            try {
              const pd = await getProductByHandle(product.handle);
              const pricing = pd?.product?.pricing || null;
              const descriptionHtml = pd?.product?.descriptionHtml || null;
              for (const karat of ["10K", "14K", "18K"]) {
                const result = await computeItemPrice(pricing, descriptionHtml, karat);
                if (result?.totalPrice) prices[`${product.handle}_${karat}`] = result.totalPrice;
              }
            } catch {}
          })
        );

        try {
          const prevEntry = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
          const cacheEntry = (timeStale || configChanged)
            ? { timestamp: Date.now(), configVersion, prices }
            : { timestamp: prevEntry?.timestamp || Date.now(), configVersion, prices };
          localStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry));
        } catch {}
      }

      if (mounted) setLivePrices(prices);
    }

    loadCuratedProducts();

    return () => {
      mounted = false;
    };
  }, []);

  const getCollectionMatchedPrice = (product) => {
    return (
      livePrices[`${product.handle}_10K`] ||
      product.price ||
      0
    );
  };

  const isHomeLivePriceReady = (product) => !!livePrices[`${product.handle}_10K`];

  const scrollSlider = (ref, direction) => {
    const slider = ref.current;
    if (!slider) return;
    const card = slider.querySelector("[data-slider-card='true']");
    if (!card) return;
    const cardsToMove = window.innerWidth >= 768 ? 4 : 2;
    const cardWidth = card.getBoundingClientRect().width;
    const styles = window.getComputedStyle(slider);
    const gap = parseFloat(styles.columnGap || styles.gap || "16") || 16;
    const delta = (cardWidth + gap) * cardsToMove * direction;

    slider.scrollBy({ left: delta, behavior: "smooth" });
  };

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
      <section id="collections" className="py-8 md:py-16 px-6 md:px-16 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-semibold mb-8 text-[#0a1833]">
            Collections
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Rings", img: "/rings.jpg", link: "/rings" },
              { name: "Earrings", img: "/earrings.jpeg", link: "/earrings" },
              { name: "Bracelets", img: "/bracelets.jpg", link: "/bracelets" },
              { name: "Pendants", img: "/necklaces.png", link: "/pendants" },
            ].map((item, i) => (
              <div
                key={i}
                className="relative h-44 md:h-110 rounded-2xl overflow-hidden shadow-lg group cursor-pointer"
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
                <div className="absolute top-3 left-3 w-fit bg-[#808080]/60 text-white px-3 py-1 rounded-full text-sm md:text-xl font-medium md:hidden">
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
      <section id="customizations" className="py-8 md:py-16 px-6 md:px-16 lg:px-24">
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


      {(bestSellers.length > 0 || featuredProducts.length > 0) && (
        <section className="py-8 md:py-16 px-6 md:px-16 lg:px-24 bg-[#f7f5f2]">
          <div className="max-w-7xl mx-auto space-y-12">
            {bestSellers.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-semibold text-[#0a1833]">
                    Best Sellers
                  </h2>
                  <Link
                    href="/rings"
                    className="text-sm font-medium text-[#0a1833] underline"
                  >
                    View all
                  </Link>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                  <button
                    type="button"
                    onClick={() => scrollSlider(bestSellersSliderRef, -1)}
                    className="hidden md:inline-flex shrink-0 p-2.5 rounded-full border border-gray-200 bg-white shadow-md hover:bg-gray-50"
                    aria-label="Scroll best sellers left"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="relative flex-1 overflow-hidden">
                    <div className="absolute inset-y-0 left-0 w-10 z-[5] bg-linear-to-r from-[#f7f5f2] to-transparent pointer-events-none" />
                    <div className="absolute inset-y-0 right-0 w-10 z-[5] bg-linear-to-l from-[#f7f5f2] to-transparent pointer-events-none" />
                    <div
                      ref={bestSellersSliderRef}
                      className="grid grid-flow-col auto-cols-[calc((100%_-_10px)/2)] md:auto-cols-[calc((100%_-_48px)/4)] gap-[10px] md:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
                      style={{ scrollbarWidth: "none" }}
                    >
                      {bestSellers.map((product) => (
                        <button
                          key={`bs-${product.id}`}
                          data-slider-card="true"
                          onClick={() => router.push(`/product/${product.handle}`)}
                          className="snap-start text-left bg-white rounded-2xl border border-[#ece7df] shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.1)] transition overflow-hidden"
                        >
                          <div className="relative aspect-[4/5] bg-gray-100">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.imageAlt}
                                fill
                                sizes="(max-width: 768px) 50vw, 25vw"
                                className="object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="p-4">
                            {/* <p className="text-xs font-medium text-amber-700 mb-1">
                              Best Seller
                            </p> */}
                            <h3 className="text-sm md:text-base font-medium text-[#0a1833] line-clamp-2">
                              {product.title}
                            </h3>
                            <p className={`text-sm font-semibold text-[#0a1833] mt-1 transition-opacity duration-300 ${!isHomeLivePriceReady(product) ? "opacity-40" : ""}`}>
                              Starting {formatIndianCurrency(getCollectionMatchedPrice(product), false)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => scrollSlider(bestSellersSliderRef, 1)}
                    className="hidden md:inline-flex shrink-0 p-2.5 rounded-full border border-gray-200 bg-white shadow-md hover:bg-gray-50"
                    aria-label="Scroll best sellers right"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {featuredProducts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-semibold text-[#0a1833]">
                    Featured
                  </h2>
                  <Link
                    href="/rings"
                    className="text-sm font-medium text-[#0a1833] underline"
                  >
                    View all
                  </Link>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                  <button
                    type="button"
                    onClick={() => scrollSlider(featuredSliderRef, -1)}
                    className="hidden md:inline-flex shrink-0 p-2.5 rounded-full border border-gray-200 bg-white shadow-md hover:bg-gray-50"
                    aria-label="Scroll featured left"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="relative flex-1 overflow-hidden">
                    <div className="absolute inset-y-0 left-0 w-10 z-[5] bg-linear-to-r from-[#f7f5f2] to-transparent pointer-events-none" />
                    <div className="absolute inset-y-0 right-0 w-10 z-[5] bg-linear-to-l from-[#f7f5f2] to-transparent pointer-events-none" />
                    <div
                      ref={featuredSliderRef}
                      className="grid grid-flow-col auto-cols-[calc((100%_-_10px)/2)] md:auto-cols-[calc((100%_-_48px)/4)] gap-[10px] md:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
                      style={{ scrollbarWidth: "none" }}
                    >
                      {featuredProducts.map((product) => (
                        <button
                          key={`ft-${product.id}`}
                          data-slider-card="true"
                          onClick={() => router.push(`/product/${product.handle}`)}
                          className="snap-start text-left bg-white rounded-2xl border border-[#ece7df] shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.1)] transition overflow-hidden"
                        >
                          <div className="relative aspect-[4/5] bg-gray-100">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.imageAlt}
                                fill
                                sizes="(max-width: 768px) 50vw, 25vw"
                                className="object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="p-4">
                            {/* <p className="text-xs font-medium text-purple-700 mb-1">
                              Featured
                            </p> */}
                            <h3 className="text-sm md:text-base font-medium text-[#0a1833] line-clamp-2">
                              {product.title}
                            </h3>
                            <p className={`text-sm font-semibold text-[#0a1833] mt-1 transition-opacity duration-300 ${!isHomeLivePriceReady(product) ? "opacity-40" : ""}`}>
                              Starting {formatIndianCurrency(getCollectionMatchedPrice(product), false)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => scrollSlider(featuredSliderRef, 1)}
                    className="hidden md:inline-flex shrink-0 p-2.5 rounded-full border border-gray-200 bg-white shadow-md hover:bg-gray-50"
                    aria-label="Scroll featured right"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Testimonials */}
      <section className="py-16 px-6 md:px-16 lg:px-24 bg-[#0a1833]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold text-white text-center mb-2">
            What Our Customers Say
          </h2>
          <p className="text-center text-[#c9a84c] text-sm tracking-widest uppercase mb-12">
            Real stories, real sparkle
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 hover:bg-white/10 transition"
              >
                {/* Stars */}
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, s) => {
                    const full = s + 1 <= Math.floor(t.rating);
                    const partial = !full && s < t.rating;
                    const fill = partial ? Math.round((t.rating - s) * 100) : 0;
                    const style = full
                      ? { color: "#c9a84c" }
                      : partial
                      ? {
                          background: `linear-gradient(to right, #c9a84c ${fill}%, rgba(255,255,255,0.2) ${fill}%)`,
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }
                      : { color: "rgba(255,255,255,0.2)" };
                    return (
                      <span key={s} className="text-lg" style={style}>★</span>
                    );
                  })}
                </div>

                {/* Quote */}
                <p className="text-white/80 text-sm leading-relaxed flex-1">
                  &ldquo;{t.text}&rdquo;
                </p>

                {/* Author */}
                <div className="border-t border-white/10 pt-4">
                  <p className="text-white font-semibold text-sm">{t.name}</p>
                  <p className="text-white/40 text-xs">{t.location} · {t.product}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Promise Section */}
      <OurPromise />


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


    </div>
  );
}
