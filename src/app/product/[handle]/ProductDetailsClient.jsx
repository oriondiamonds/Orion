"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  ShoppingCart,
  Heart,
  Share2,
  Check,
  Link as LinkIcon,
  Facebook,
  Twitter,
  X,
  ChevronLeft,
  ChevronRight,
  Truck,
  RotateCcw,
  ArrowLeftRight,
  ScrollText,
  BadgeCheck,
} from "lucide-react";
import { getProductByHandle } from "../../../queries/products";
import ProductAccordion from "../../../components/accordian";
import toast from "react-hot-toast";
import { formatINR } from "../../../utils/formatIndianCurrency";
import { useSession } from "next-auth/react";
import { syncCartToServer } from "../../../utils/cartSync";
import { syncWishlistToServer } from "../../../utils/wishlistSync";

export default function ProductDetails() {
  const modalRef = useRef(null);
  const { handle } = useParams();
  const searchParams = useSearchParams();
  const karatFromUrl = searchParams.get("karat");
  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [totalPrice, setTotalPrice] = useState(null);
  const { data: session } = useSession();
  const [thumbsLoaded, setThumbsLoaded] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const totalThumbs = (product?.images?.edges?.length || 0) + 1;

  const [engravingText, setEngravingText] = useState("");
  const handlePriceData = (data) => {
    setTotalPrice(data.totalPrice);
  };

  const features = [
    {
      icon: <Truck className="w-8 h-8 text-[#0a1833]" />,
      text: "Free Shipping & Insurance",
    },
    {
      icon: <RotateCcw className="w-8 h-8 text-[#0a1833]" />,
      text: "15 Days Return Policy",
    },
    {
      icon: <ArrowLeftRight className="w-8 h-8 text-[#0a1833]" />,
      text: "100% Exchange Value",
    },
    {
      icon: <ScrollText className="w-8 h-8 text-[#0a1833]" />,
      text: "IGI Certified Diamonds",
    },
    {
      icon: <BadgeCheck className="w-8 h-8 text-[#0a1833]" />,
      text: "BIS Hallmarked Gold",
    },
  ];
  const addToCart = async () => {
    if (!selectedVariant) {
      toast.error("Please select a variant");
      return;
    }

    // ----- VALIDATIONS -----
    if (
      (handle?.toLowerCase().endsWith("-ring") ||
        handle?.toLowerCase().endsWith("-band")) &&
      !selectedOptions["Ring Size"]
    ) {
      toast.error("Please select a ring size");
      return;
    }

    if (
      handle?.toLowerCase().endsWith("-bracelet") &&
      !selectedOptions["Wrist Size"]
    ) {
      toast.error("Please select a wrist size");
      return;
    }

    // ----- LOAD LOCAL CART -----
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");

    const existingItemIndex = cart.findIndex(
      (item) => item.variantId === selectedVariant.id
    );

    // ----- SELECTED OPTIONS ARRAY -----
    const finalSelectedOptions = [
      ...Object.entries(selectedOptions).map(([name, value]) => ({
        name,
        value,
      })),
    ];

    // ENGRAVING SUPPORT
    if (
      (handle?.toLowerCase().endsWith("-ring") ||
        handle?.toLowerCase().endsWith("-band")) &&
      engravingText.trim()
    ) {
      finalSelectedOptions.push({
        name: "Engraving",
        value: engravingText.trim(),
      });
    }

    // ----- NEW ITEM OBJECT -----
    const newItem = {
      variantId: selectedVariant.id,
      handle: product.handle,
      title: product.title,
      variantTitle: selectedVariant.title,
      image: selectedVariant.image?.url || product.featuredImage?.url,
      price: parseFloat(totalPrice),
      calculatedPrice: parseFloat(totalPrice),
      currencyCode: selectedVariant.price.currencyCode,
      quantity: quantity,
      selectedOptions: finalSelectedOptions,
    };

    // ----- MERGE LOGIC -----
    if (existingItemIndex > -1) {
      cart[existingItemIndex].quantity += quantity;

      // merge engraving
      if (engravingText.trim()) {
        const engravingExists = cart[existingItemIndex].selectedOptions.some(
          (opt) => opt.name === "Engraving"
        );

        if (engravingExists) {
          cart[existingItemIndex].selectedOptions = cart[
            existingItemIndex
          ].selectedOptions.map((opt) =>
            opt.name === "Engraving"
              ? { name: "Engraving", value: engravingText.trim() }
              : opt
          );
        } else {
          cart[existingItemIndex].selectedOptions.push({
            name: "Engraving",
            value: engravingText.trim(),
          });
        }
      }
    } else {
      cart.push(newItem);
    }

    // ----- SAVE TO LOCAL STORAGE -----
    localStorage.setItem("cart", JSON.stringify(cart));

    // Update UI immediately (navbar/cart count)
    window.dispatchEvent(new Event("cartUpdated"));

    toast.success(`${quantity} × ${product.title} added to cart!`);

    // ----- SYNC TO MONGODB -----
    const customerEmail =
      session?.user?.email ||
      (typeof window !== "undefined"
        ? localStorage.getItem("customer_email")
        : null);

    if (customerEmail) {
      try {
        await syncCartToServer(customerEmail);
        console.log("✅ Cart synced to server");
      } catch (err) {
        console.error("Server cart sync failed:", err);
      }
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [handle]);
  useEffect(() => {
    if (isModalOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isModalOpen]);
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  useEffect(() => {
    // Add safety check for product
    if (!product || !product.id) return;

    const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
    const inWishlist = wishlist.some((item) => item.id === product.id);
    setIsWishlisted(inWishlist);

    // Listen for wishlist updates
    const handleWishlistUpdate = () => {
      const updatedWishlist = JSON.parse(
        localStorage.getItem("wishlist") || "[]"
      );
      const stillInWishlist = updatedWishlist.some(
        (item) => item.id === product.id
      );
      setIsWishlisted(stillInWishlist);
    };

    window.addEventListener("wishlistUpdated", handleWishlistUpdate);

    return () => {
      window.removeEventListener("wishlistUpdated", handleWishlistUpdate);
    };
  }, [product?.id]); // Use optional chaining in dependency

  useEffect(() => {
    if (!selectedOptions["Gold Color"] || !product?.images?.edges) return;

    const colorImageMap = {
      "White Gold": 0, // Index 0 = first image (1-4 range)
      "Rose Gold": 4, // Index 4 = fifth image (5-8 range)
      "Yellow Gold": 8, // Index 8 = ninth image (9-12 range)
    };

    const startIndex = colorImageMap[selectedOptions["Gold Color"]];
    if (startIndex !== undefined && product.images.edges[startIndex]) {
      const imageUrl = product.images.edges[startIndex].node.url;
      setSelectedImage(imageUrl);

      // Scroll thumbnail into view
      setTimeout(() => {
        const thumbnail = document.querySelector(
          `button[data-image-url="${imageUrl}"]`
        );
        if (thumbnail) {
          thumbnail.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
      }, 100);
    }
  }, [selectedOptions["Gold Color"], product]);

  const fetchProduct = async () => {
    if (!handle) return;

    try {
      setLoading(true);
      const response = await getProductByHandle(handle);

      if (response?.product) {
        const productData = response.product;
        setProduct(productData);

        setSelectedImage(
          productData?.images?.edges?.[0]?.node?.url ||
            productData?.featuredImage?.url
        );

        const defaultVariant =
          productData.variants.edges.find(({ node }) =>
            node.selectedOptions.some(
              (opt) => opt.name === "Gold Color" && opt.value === "White Gold"
            )
          )?.node || productData.variants.edges[0]?.node; // Fallback to first if Yellow Gold not found

        if (defaultVariant) {
          const initialOptions = {};
          defaultVariant.selectedOptions.forEach((option) => {
            initialOptions[option.name] = option.value;
          });

          // Override Gold Karat if passed from collection page
          if (karatFromUrl && initialOptions["Gold Karat"]) {
            initialOptions["Gold Karat"] = karatFromUrl;
            const matchingVariant = productData.variants.edges.find(
              ({ node }) =>
                node.selectedOptions.every(
                  (opt) => initialOptions[opt.name] === opt.value
                )
            )?.node;
            setSelectedVariant(matchingVariant || defaultVariant);
          } else {
            setSelectedVariant(defaultVariant);
          }

          setSelectedOptions(initialOptions);
        }
      }
    } catch (err) {
      console.error("Error fetching product:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (optionName, optionValue) => {
    const newSelectedOptions = {
      ...selectedOptions,
      [optionName]: optionValue,
    };
    setSelectedOptions(newSelectedOptions);

    const variant = product.variants.edges.find(({ node }) =>
      node.selectedOptions.every(
        (opt) => newSelectedOptions[opt.name] === opt.value
      )
    )?.node;

    if (variant) setSelectedVariant(variant);
  };

  const getOptionValues = (optionName) => {
    if (!product) return [];
    const values = new Set();
    product.variants.edges.forEach(({ node }) => {
      const opt = node.selectedOptions.find((o) => o.name === optionName);
      if (opt) values.add(opt.value);
    });
    return Array.from(values);
  };

  const toggleWishlist = () => {
    if (!product || !product.id) {
      toast.error("Product information not available");
      return;
    }

    const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");

    if (isWishlisted) {
      // Remove from wishlist
      const newWishlist = wishlist.filter((item) => item.id !== product.id);
      localStorage.setItem("wishlist", JSON.stringify(newWishlist));
      setIsWishlisted(false);
      toast.success("Removed from wishlist");

      window.dispatchEvent(new Event("wishlistUpdated"));

      // Sync to server if logged in
      if (session?.user?.email) {
        syncWishlistToServer(session.user.email);
      }
    } else {
      if (!selectedVariant) {
        toast.error("Please select a variant");
        return;
      }

      const wishlistItem = {
        id: product.id,
        variantId: selectedVariant.id,
        handle: product.handle,
        title: product.title,
        variantTitle: selectedVariant.title,
        image: selectedVariant?.image?.url || product.featuredImage?.url,
        price: parseFloat(selectedVariant?.price?.amount),
        currencyCode: selectedVariant?.price?.currencyCode,
        variant: selectedVariant?.id,
        selectedOptions,
        addedAt: new Date().toISOString(),
      };

      wishlist.push(wishlistItem);
      localStorage.setItem("wishlist", JSON.stringify(wishlist));
      setIsWishlisted(true);
      toast.success("Added to wishlist!");
      window.dispatchEvent(new Event("wishlistUpdated"));

      // Sync to server if logged in
      if (session?.user?.email) {
        syncWishlistToServer(session.user.email);
      }
    }
  };

  const handleShare = async (platform) => {
    const url = window.location.href;
    const text = `Check out ${product.title}`;

    switch (platform) {
      case "copy":
        try {
          await navigator.clipboard.writeText(url);
          setCopySuccess(true);
          setTimeout(() => {
            setCopySuccess(false);
            setShowShareMenu(false);
          }, 2000);
        } catch (err) {
          console.error("Failed to copy:", err);
        }
        break;

      case "facebook":
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
            url
          )}`,
          "_blank",
          "width=600,height=400"
        );
        setShowShareMenu(false);
        break;

      case "twitter":
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            text
          )}&url=${encodeURIComponent(url)}`,
          "_blank",
          "width=600,height=400"
        );
        setShowShareMenu(false);
        break;

      case "whatsapp":
        window.open(
          `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
          "_blank"
        );
        setShowShareMenu(false);
        break;

      case "native":
        if (navigator.share) {
          try {
            await navigator.share({
              title: product.title,
              text: text,
              url: url,
            });
            setShowShareMenu(false);
          } catch (err) {
            console.log("Share cancelled or failed:", err);
          }
        }
        break;

      default:
        break;
    }
  };

  if (loading) return <p className="text-center mt-10">Loading...</p>;
  if (error) return <p className="text-center mt-10 text-red-600">{error}</p>;
  if (!product) return <p className="text-center mt-10">Product not found</p>;

  // Get all images as an array
  const allImages = [
    ...(product.images?.edges?.map(({ node }) => node.url) || []),
    "/dct.jpg",
  ];
  const currentImageIndex = allImages.indexOf(
    selectedImage || selectedVariant?.image?.url || product.featuredImage?.url
  );

  let touchStartX = 0;
  let touchEndX = 0;

  const handleTouchStart = (e) => {
    touchStartX = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const swipeDistance = touchEndX - touchStartX;
    if (Math.abs(swipeDistance) > 50) {
      if (swipeDistance > 0) {
        navigateImage("prev"); // Swipe right → previous image
      } else {
        navigateImage("next"); // Swipe left → next image
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!isZoomed || window.innerWidth <= 768) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  const navigateImage = (direction) => {
    const newIndex =
      direction === "next"
        ? (currentImageIndex + 1) % allImages.length
        : (currentImageIndex - 1 + allImages.length) % allImages.length;
    setSelectedImage(allImages[newIndex]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowLeft") navigateImage("prev");
    if (e.key === "ArrowRight") navigateImage("next");
    if (e.key === "Escape") setIsModalOpen(false);
  };
  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  return (
    <>
      <div className="pt-40 max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="flex flex-col gap-4">
            {/* Main Image */}
            <div
              className="bg-white rounded-lg shadow-md aspect-square flex items-center justify-center max-h-[60vh] relative overflow-hidden cursor-zoom-in"
              onClick={() => setIsModalOpen(true)}
              onMouseEnter={() => window.innerWidth > 768 && setIsZoomed(true)}
              onMouseLeave={() => {
                if (window.innerWidth > 768) {
                  setIsZoomed(false);
                  setZoomPosition({ x: 50, y: 50 });
                }
              }}
              onMouseMove={handleMouseMove}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Fade-in image */}
              <img
                src={
                  selectedImage ||
                  selectedVariant?.image?.url ||
                  product.featuredImage?.url
                }
                alt={product.title}
                onLoad={handleImageLoad}
                className={`max-h-full max-w-full object-contain transition-all duration-500 ${
                  imageLoaded
                    ? "opacity-100 scale-100"
                    : "opacity-0 scale-95 blur-sm"
                }`}
                style={
                  isZoomed && window.innerWidth > 768
                    ? {
                        transform: "scale(2)",
                        transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                      }
                    : {}
                }
              />
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-white">
                  <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <span className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white/70 px-2 py-0.5 rounded-md">
                Click to expand
              </span>
            </div>

            {!thumbsLoaded && (
              <div className="w-full h-2 bg-gray-300 rounded-md overflow-hidden mb-2">
                <div
                  className="h-full bg-[#0a1833] animate-pulse transition-all duration-300"
                  style={{ width: `${(loadedCount / totalThumbs) * 100}%` }}
                ></div>
              </div>
            )}

            {/* Thumbnail Strip */}
            <div className="flex gap-3 overflow-x-auto">
              {product.images?.edges?.map(({ node }) => (
                <button
                  key={node.url}
                  data-image-url={node.url}
                  onClick={() => {
                    setImageLoaded(false);
                    setSelectedImage(node.url);
                  }}
                  className={`border-2 rounded-lg p-1 shrink-0 transition-all ${
                    selectedImage === node.url
                      ? "border-black"
                      : "border-transparent hover:border-gray-400"
                  }`}
                >
                  <img
                    src={node.url}
                    alt={node.altText || product.title}
                    className="w-20 h-20 object-cover rounded-md"
                    onLoad={() => {
                      setLoadedCount((prev) => {
                        const next = prev + 1;
                        if (next === totalThumbs) setThumbsLoaded(true);
                        return next;
                      });
                    }}
                  />
                </button>
              ))}

              {/* DCT.jpg thumbnail */}
              <button
                data-image-url="/dct.jpg"
                onClick={() => {
                  setImageLoaded(false);
                  setSelectedImage("/dct.jpg");
                }}
                className={`border-2 rounded-lg p-1 shrink-0 transition-all ${
                  selectedImage === "/dct.jpg"
                    ? "border-black"
                    : "border-transparent hover:border-gray-400"
                }`}
              >
                <img
                  src="/dct.jpg"
                  alt="DCT"
                  className="w-20 h-20 object-cover rounded-md"
                  onLoad={() => {
                    setLoadedCount((prev) => {
                      const next = prev + 1;
                      if (next === totalThumbs) setThumbsLoaded(true);
                      return next;
                    });
                  }}
                />
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="space-y-6">
            <h1 className="text-3xl font-bold capitalize">{product.title}</h1>
            <p className="text-2xl font-semibold text-gray-900">
              {totalPrice === undefined || totalPrice === null ? (
                <span className="inline-block h-6 w-50 bg-gray-200 rounded animate-pulse"></span>
              ) : (
                <>{formatINR(totalPrice)}</>
              )}
            </p>

            {/* Options */}
            <div className="space-y-4">
              {/* Color Selection */}
              {product.options.some((opt) => opt.name === "Gold Color") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gold Color
                  </label>
                  <div className="flex gap-3">
                    {[
                      { name: "White Gold", img: "/silver.png" },
                      { name: "Rose Gold", img: "/rose.png" },
                      { name: "Yellow Gold", img: "/yellow.png" },
                    ].map(({ name, img }) => (
                      <label key={name} className="cursor-pointer">
                        <input
                          type="radio"
                          name="gold-color"
                          value={name}
                          checked={selectedOptions["Gold Color"] === name}
                          onChange={() =>
                            handleOptionChange("Gold Color", name)
                          }
                          className="hidden"
                        />
                        <div
                          className={`w-10 h-10 rounded-full overflow-hidden border transition-transform ${
                            selectedOptions["Gold Color"] === name
                              ? "border-black scale-110"
                              : "border-gray-300"
                          }`}
                        >
                          <img
                            src={img}
                            alt={name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Gold Karat Dropdown */}
              {product.options.some((opt) => opt.name === "Gold Karat") && (
                <div className="relative w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gold Karat
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 cursor-pointer"
                    value={selectedOptions["Gold Karat"] || ""}
                    onChange={(e) =>
                      handleOptionChange("Gold Karat", e.target.value)
                    }
                  >
                    <option value="">Select Karat</option>
                    {getOptionValues("Gold Karat").map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {/* Ring Size Dropdown (only if product is a ring) */}
              {(handle?.toLowerCase().endsWith("-ring") ||
                handle?.toLowerCase().endsWith("-band")) && (
                <div className="relative w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ring Size
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 cursor-pointer"
                    value={selectedOptions["Ring Size"] || ""}
                    onChange={(e) =>
                      handleOptionChange("Ring Size", e.target.value)
                    }
                  >
                    <option value="">Select Ring Size</option>
                    {Array.from({ length: 19 }, (_, i) => i + 4).map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>

                  {/* Size Guide Link */}
                  <p
                    className="text-sm text-gray-600 underline cursor-pointer mt-2"
                    onClick={() => setShowSizeGuide(true)}
                  >
                    View Size Guide
                  </p>

                  {/* ---------- ENGRAVING FIELD (inside the ring block) ---------- */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Engraving (optional)
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      placeholder="Enter up to 10-12 characters"
                      value={engravingText}
                      onChange={(e) => setEngravingText(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {engravingText.length}/12 characters
                    </p>
                  </div>
                </div>
              )}
              {/* Engraving Option – only for rings */}

              {/* Bracelet Size Dropdown (only if product is a bracelet) */}
              {handle?.toLowerCase().endsWith("-bracelet") && (
                <div className="relative w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wrist Size
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 cursor-pointer"
                    value={selectedOptions["Wrist Size"] || ""}
                    onChange={(e) =>
                      handleOptionChange("Wrist Size", e.target.value)
                    }
                  >
                    <option value="">Select Wrist Size</option>
                    {[
                      "5.0",
                      "5.5",
                      "6.0",
                      "6.5",
                      "7.0",
                      "7.5",
                      "8.0",
                      "8.5",
                      "9.0",
                    ].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>

                  {/* Bracelet Size Guide Link */}
                  <p
                    className="text-sm text-gray-600 underline cursor-pointer mt-2"
                    onClick={() => setShowSizeGuide(true)}
                  >
                    View Size Guide
                  </p>
                </div>
              )}
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-3 mt-4 ">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 cursor-pointer h-10 border rounded-lg flex items-center justify-center hover:bg-gray-50"
              >
                -
              </button>
              <span className="w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 cursor-pointer h-10 border rounded-lg flex items-center justify-center hover:bg-gray-50"
              >
                +
              </button>
            </div>

            {/* Add to Cart */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={addToCart}
                className="flex-1 cursor-pointer bg-black text-white py-3 rounded-full flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
              >
                <ShoppingCart size={20} />
                Add to Cart
              </button>

              {/* Wishlist Button */}
              <button
                onClick={toggleWishlist}
                className={`w-12 h-12 border rounded-full flex items-center justify-center cursor-pointer transition-all ${
                  isWishlisted ? "bg-red-50 border-red-500" : "hover:bg-gray-50"
                }`}
                title={
                  isWishlisted ? "Remove from wishlist" : "Add to wishlist"
                }
              >
                <Heart
                  size={20}
                  className={`transition-colors cursor-pointer ${
                    isWishlisted
                      ? "fill-red-500 text-red-500"
                      : "hover:text-red-500"
                  }`}
                />
              </button>

              {/* Share Button with Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="w-12 h-12 border rounded-full flex items-center cursor-pointer justify-center hover:bg-gray-50 transition-colors"
                  title="Share product"
                >
                  <Share2 size={20} />
                </button>

                {/* Share Menu */}
                {showShareMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <div className="py-2">
                      <button
                        onClick={() => handleShare("copy")}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                      >
                        {copySuccess ? (
                          <>
                            <Check size={18} className="text-green-500" />
                            <span className="text-green-500">Link copied!</span>
                          </>
                        ) : (
                          <>
                            <LinkIcon size={18} />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleShare("whatsapp")}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                      >
                        <svg
                          className="w-[18px] h-[18px]"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                        <span>WhatsApp</span>
                      </button>

                      <button
                        onClick={() => handleShare("facebook")}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                      >
                        <Facebook size={18} />
                        <span>Facebook</span>
                      </button>

                      <button
                        onClick={() => handleShare("twitter")}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                      >
                        <Twitter size={18} />
                        <span>Twitter</span>
                      </button>

                      {navigator.share && (
                        <button
                          onClick={() => handleShare("native")}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors border-t"
                        >
                          <Share2 size={18} />
                          <span>More options...</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Product Assurance Icons */}
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-700">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <BadgeCheck className="w-5 h-5 text-gray-800 shrink-0" />
                <span>BIS Hallmarked Gold</span>
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <RotateCcw className="w-5 h-5 text-gray-800 shrink-0" />
                <span>15 Days Return Policy</span>
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <ArrowLeftRight className="w-5 h-5 text-gray-800 shrink-0" />
                <span>100% Exchange Value</span>
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <ScrollText className="w-5 h-5 text-gray-800 shrink-0" />
                <span>IGI Certified Diamonds</span>
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Truck className="w-5 h-5 text-gray-800 shrink-0" />
                <span>Free Shipping & Insurance</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <ProductAccordion
          product={product}
          selectedOptions={selectedOptions}
          selectedVariant={selectedVariant}
          onPriceData={handlePriceData}
        />
      </div>

      {/* Full Screen Modal */}
      {isModalOpen && (
        <div
          ref={modalRef}
          className="fixed inset-0 bg-white z-50 flex items-center justify-center overflow-hidden touch-none"
          onKeyDown={handleKeyDown}
          tabIndex={0}
          onClick={(e) => {
            // Close if clicked outside the image
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
          onTouchStart={(e) => (touchStartX = e.touches[0].clientX)}
          onTouchMove={(e) => (touchEndX = e.touches[0].clientX)}
          onTouchEnd={() => {
            const swipeDistance = touchEndX - touchStartX;
            if (Math.abs(swipeDistance) > 50) {
              if (swipeDistance > 0) navigateImage("prev");
              else navigateImage("next");
            }
          }}
        >
          {/* Close Button */}
          <button
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 text-black hover:text-gray-300 transition-colors z-10"
            aria-label="Close modal"
          >
            <X size={32} />
          </button>

          {/* Prev Button */}
          {allImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateImage("prev");
              }}
              className="absolute left-4 text-white hover:text-gray-300 transition-colors z-10 bg-black/50 rounded-full p-2"
              aria-label="Previous image"
            >
              <ChevronLeft size={32} />
            </button>
          )}

          {/* Image */}
          <img
            src={
              selectedImage ||
              selectedVariant?.image?.url ||
              product.featuredImage?.url
            }
            alt={product.title}
            className="h-[90vh] max-w-[90vw] object-contain p-4 rounded-lg"
          />

          {/* Next Button */}
          {allImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateImage("next");
              }}
              className="absolute right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black/50 rounded-full p-2"
              aria-label="Next image"
            >
              <ChevronRight size={32} />
            </button>
          )}

          {/* Image Counter */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black/50 px-4 py-2 rounded-full text-sm">
            {currentImageIndex + 1} / {allImages.length}
          </div>
        </div>
      )}

      {/* Ring Size Guide Modal */}
      {showSizeGuide && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-lg relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setShowSizeGuide(false)}
              className="absolute top-3 right-3 text-gray-600 hover:text-black"
            >
              <X size={24} />
            </button>

            {/* If product is ring → show ring instructions */}
            {handle?.toLowerCase().endsWith("-ring") ||
            handle?.toLowerCase().endsWith("-band") ? (
              <>
                <h2 className="text-2xl font-semibold mb-4 text-center">
                  How to Measure Your Ring Size
                </h2>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-6">
                  <li>
                    Wrap a string, piece of paper, or fabric around the base of
                    your finger.
                  </li>
                  <li>
                    Make sure it’s snug but not tight, then mark the spot where
                    it overlaps.
                  </li>
                  <li>
                    Measure the length in millimeters (mm) and find your size
                    below.
                  </li>
                </ol>

                <h3 className="text-lg font-semibold mb-2">
                  Ring Size Guide (mm)
                </h3>
                <table className="w-full text-sm border-collapse border border-gray-300 text-center">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 p-2">Ring Size</th>
                      <th className="border border-gray-300 p-2">
                        Circumference (mm)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      [4, 43.6],
                      [5, 44.8],
                      [6, 46.1],
                      [7, 47.4],
                      [8, 48.7],
                      [9, 50.0],
                      [10, 51.2],
                      [11, 52.5],
                      [12, 53.8],
                      [13, 55.1],
                      [14, 56.3],
                      [15, 57.6],
                      [16, 58.9],
                      [17, 60.2],
                      [18, 61.4],
                      [19, 62.7],
                      [20, 64.0],
                      [21, 65.3],
                      [22, 66.6],
                    ].map(([size, mm]) => (
                      <tr key={size}>
                        <td className="border border-gray-300 p-2">{size}</td>
                        <td className="border border-gray-300 p-2">{mm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              // Bracelet size guide → show image
              <>
                <h2 className="text-2xl font-semibold mb-4 text-center">
                  Bracelet Size Guide
                </h2>
                <img
                  src="/bt_size_guide.png"
                  alt="Bracelet Size Guide"
                  className="rounded-lg mx-auto max-w-full h-auto"
                />
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
