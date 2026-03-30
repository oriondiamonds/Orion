"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
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
  Zap,
} from "lucide-react";
import { getProductByHandle } from "../../../queries/products";
import { supabase } from "../../../utils/supabase.js";
import ProductAccordion from "../../../components/accordian";
import RelatedProducts from "../../../components/RelatedProducts";
import toast from "react-hot-toast";
import { formatINR } from "../../../utils/formatIndianCurrency";
import { useSession } from "next-auth/react";
import { syncCartToServer } from "../../../utils/cartSync";
import { markCartLocallyModified } from "../../../utils/cartCleanup";
import {
  syncWishlistToServer,
  removeWishlistItemFromServer,
} from "../../../utils/wishlistSync";

export default function ProductDetails() {
  const modalRef = useRef(null);
  const router = useRouter();
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
  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const { data: session } = useSession();
  const [thumbsLoaded, setThumbsLoaded] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const totalThumbs = (product?.images?.edges?.length || 0) + 1;

  const [engravingText, setEngravingText] = useState("");

  // Reviews
  const [reviews, setReviews] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({ name: "", location: "", rating: 0, text: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewImageFile, setReviewImageFile] = useState(null);
  const [reviewImagePreview, setReviewImagePreview] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // ============================================
  // PRICE DISPLAY HANDLER
  // ============================================
  const handlePriceData = (data) => {
    console.log("🎯 [PRODUCT DETAIL] Price data received:", data);
    setTotalPrice(data.totalPrice);
    setPriceBreakdown(data);
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

    if (!priceBreakdown || !totalPrice) {
      toast.error("Price is still loading, please wait a moment");
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
      (item) => item.variantId === selectedVariant.id,
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
      priceBreakdown: priceBreakdown || null,
    };

    // ----- MERGE LOGIC -----
    if (existingItemIndex > -1) {
      cart[existingItemIndex].quantity += quantity;

      // merge engraving
      if (engravingText.trim()) {
        const engravingExists = cart[existingItemIndex].selectedOptions.some(
          (opt) => opt.name === "Engraving",
        );

        if (engravingExists) {
          cart[existingItemIndex].selectedOptions = cart[
            existingItemIndex
          ].selectedOptions.map((opt) =>
            opt.name === "Engraving"
              ? { name: "Engraving", value: engravingText.trim() }
              : opt,
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
    markCartLocallyModified();

    // Update UI immediately (navbar/cart count)
    window.dispatchEvent(new Event("cartUpdated"));

    toast.success(`${quantity} × ${product.title} added to cart!`);

    // ----- SYNC TO SERVER -----
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

  const buyNow = () => {
    if (!selectedVariant) {
      toast.error("Please select a variant");
      return;
    }

    if (!priceBreakdown || !totalPrice) {
      toast.error("Price is still loading, please wait a moment");
      return;
    }

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

    const finalSelectedOptions = [
      ...Object.entries(selectedOptions).map(([name, value]) => ({
        name,
        value,
      })),
    ];

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

    const buyNowItem = {
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
      priceBreakdown: priceBreakdown || null,
    };

    sessionStorage.setItem("buyNowItem", JSON.stringify(buyNowItem));
    router.push("/checkout?source=buynow");
  };

  useEffect(() => {
    fetchProduct();
  }, [handle]);

  useEffect(() => {
    if (!handle) return;
    fetch(`/api/reviews?handle=${handle}`)
      .then((r) => r.json())
      .then((d) => { if (d.reviews) setReviews(d.reviews); })
      .catch(() => {});
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
        localStorage.getItem("wishlist") || "[]",
      );
      const stillInWishlist = updatedWishlist.some(
        (item) => item.id === product.id,
      );
      setIsWishlisted(stillInWishlist);
    };

    window.addEventListener("wishlistUpdated", handleWishlistUpdate);

    return () => {
      window.removeEventListener("wishlistUpdated", handleWishlistUpdate);
    };
  }, [product?.id]);

  useEffect(() => {
    if (!selectedOptions["Gold Color"] || !product) return;

    const colorCodePattern = {
      "Rose Gold":   /-R-/i,
      "White Gold":  /-W-/i,
      "Yellow Gold": /-Y-/i,
    }[selectedOptions["Gold Color"]];

    const images = product.images?.edges || [];

    // Tier 1: R/W/Y pattern match in image URL (products with color-coded filenames)
    const patternMatchedUrl = colorCodePattern
      ? images.find(({ node }) => colorCodePattern.test(node.url))?.node?.url
      : null;

    // Tier 2: dynamic group-index fallback (3 or 4 images per color group)
    // floor(total / 3) → 9 imgs: 0,3,6 | 12 imgs: 0,4,8
    const goldColorOrder = ["White Gold", "Rose Gold", "Yellow Gold"];
    const colorIndex = goldColorOrder.indexOf(selectedOptions["Gold Color"]);
    const imagesPerGroup = Math.max(1, Math.floor(images.length / 3));
    const groupStart = colorIndex >= 0 ? colorIndex * imagesPerGroup : 0;
    const indexFallbackUrl = (images[groupStart] || images[0])?.node?.url;

    const imageUrl = patternMatchedUrl || indexFallbackUrl;
    if (!imageUrl) return;

    setSelectedImage(imageUrl);

    setTimeout(() => {
      const thumbnail = document.querySelector(`button[data-image-url="${imageUrl}"]`);
      if (thumbnail) {
        thumbnail.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }, 100);
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
            productData?.featuredImage?.url,
        );

        // If karat is specified via URL, find a variant matching both White Gold + that karat
        let defaultVariant;
        if (karatFromUrl) {
          defaultVariant = productData.variants.edges.find(({ node }) =>
            node.selectedOptions.some(
              (opt) => opt.name === "Gold Color" && opt.value === "White Gold",
            ) &&
            node.selectedOptions.some(
              (opt) => opt.name === "Gold Karat" && opt.value === karatFromUrl,
            ),
          )?.node;
        }

        // Fallback: 
        if (!defaultVariant) {
          defaultVariant =
            productData.variants.edges.find(({ node }) =>
              node.selectedOptions.some(
                (opt) => opt.name === "Gold Color" && opt.value === "White Gold",
              ) &&
              node.selectedOptions.some(
                (opt) => opt.name === "Gold Karat" && opt.value === "10K",
              ),
            )?.node ||
            productData.variants.edges.find(({ node }) =>
              node.selectedOptions.some(
                (opt) => opt.name === "Gold Color" && opt.value === "White Gold",
              ),
            )?.node ||
            productData.variants.edges[0]?.node;
        }

        if (defaultVariant) {
          const initialOptions = {};
          defaultVariant.selectedOptions.forEach((option) => {
            initialOptions[option.name] = option.value;
          });

          setSelectedVariant(defaultVariant);
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
        (opt) => newSelectedOptions[opt.name] === opt.value,
      ),
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

  const toggleWishlist = async () => {
    if (!product || !product.id) {
      toast.error("Product information not available");
      return;
    }

    const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");

    if (isWishlisted) {
      const newWishlist = wishlist.filter((item) => item.id !== product.id);
      localStorage.setItem("wishlist", JSON.stringify(newWishlist));
      setIsWishlisted(false);
      toast.success("Removed from wishlist");

      window.dispatchEvent(new Event("wishlistUpdated"));

      if (session?.user?.email) {
        try {
          const res = await syncWishlistToServer(session.user.email);
          if (!res || res.success === false) {
            console.error(
              "Failed to sync wishlist to server:",
              res?.error || res,
            );
            toast.error("Failed to sync wishlist to server");
          }
        } catch (err) {
          console.error("Error syncing wishlist to server:", err);
          toast.error("Failed to sync wishlist to server");
        }
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

      if (session?.user?.email) {
        try {
          const res = await syncWishlistToServer(session.user.email);
          if (!res || res.success === false) {
            console.error(
              "Failed to sync wishlist to server:",
              res?.error || res,
            );
            toast.error("Failed to sync wishlist to server");
          }
        } catch (err) {
          console.error("Error syncing wishlist to server:", err);
          toast.error("Failed to sync wishlist to server");
        }
      }
    }
  };

  const compressImage = (file, maxKB = 100) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_DIM = 1200;
          let { width, height } = img;
          if (width > MAX_DIM || height > MAX_DIM) {
            const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          let quality = 0.9;
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) { resolve(null); return; }
                if (blob.size <= maxKB * 1024 || quality <= 0.1) {
                  resolve(new File([blob], file.name, { type: "image/jpeg" }));
                } else {
                  quality = Math.max(0.1, quality - 0.1);
                  tryCompress();
                }
              },
              "image/jpeg",
              quality
            );
          };
          tryCompress();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm.name.trim()) { toast.error("Please enter your name"); return; }
    if (!reviewForm.text.trim()) { toast.error("Please write your review"); return; }
    if (!reviewForm.rating) { toast.error("Please select a rating"); return; }
    setReviewSubmitting(true);
    try {
      let image_url = null;

      if (reviewImageFile) {
        const compressed = await compressImage(reviewImageFile);
        if (compressed) {
          const path = `${handle}/${Date.now()}-${compressed.name}`;
          const { error: uploadError } = await supabase.storage
            .from("review-images")
            .upload(path, compressed, { contentType: "image/jpeg", upsert: false });
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from("review-images").getPublicUrl(path);
            image_url = urlData.publicUrl;
          }
        }
      }

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: reviewForm.name,
          location: reviewForm.location,
          product_handle: handle,
          product_title: product.title,
          rating: reviewForm.rating,
          text: reviewForm.text,
          image_url,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to submit"); return; }
      setReviews((prev) => [data.review, ...prev].sort((a, b) => b.rating - a.rating || new Date(b.created_at) - new Date(a.created_at)));
      setReviewForm({ name: "", location: "", rating: 0, text: "" });
      setReviewImageFile(null);
      setReviewImagePreview(null);
      setShowReviewModal(false);
      toast.success("Review submitted!");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setReviewSubmitting(false);
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
            url,
          )}`,
          "_blank",
          "width=600,height=400",
        );
        setShowShareMenu(false);
        break;

      case "twitter":
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            text,
          )}&url=${encodeURIComponent(url)}`,
          "_blank",
          "width=600,height=400",
        );
        setShowShareMenu(false);
        break;

      case "whatsapp":
        window.open(
          `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
          "_blank",
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

  if (loading) return (
    <div className="pt-40 max-w-6xl mx-auto px-4 animate-pulse">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Image skeleton */}
        <div className="flex flex-col gap-4">
          <div className="bg-gray-200 rounded-lg aspect-square max-h-[60vh]" />
          <div className="flex gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-20 h-20 bg-gray-200 rounded-lg shrink-0" />
            ))}
          </div>
        </div>
        {/* Info skeleton */}
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="flex gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-10 h-10 bg-gray-200 rounded-full" />
              ))}
            </div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-48" />
          <div className="flex gap-3">
            <div className="flex-1 h-12 bg-gray-200 rounded-full" />
            <div className="flex-1 h-12 bg-gray-200 rounded-full" />
            <div className="w-12 h-12 bg-gray-200 rounded-full" />
            <div className="w-12 h-12 bg-gray-200 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
  if (error) return <p className="text-center mt-10 text-red-600">{error}</p>;
  if (!product) return <p className="text-center mt-10">Product not found</p>;

  const allImages = [
    ...(product.images?.edges?.map(({ node }) => node.url) || []),
    "/dct.jpg",
  ];
  const currentImageIndex = allImages.indexOf(
    selectedImage || selectedVariant?.image?.url || product.featuredImage?.url,
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
        navigateImage("prev");
      } else {
        navigateImage("next");
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
                width={600}
                height={600}
                loading="eager"
                decoding="async"
                fetchpriority="high"
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
                    width={80}
                    height={80}
                    loading="lazy"
                    decoding="async"
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
                  width={80}
                  height={80}
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

            {/* PRICE DISPLAY - MAIN */}
            <div className="space-y-2">
              <p className="text-2xl font-semibold text-gray-900">
                {totalPrice === undefined || totalPrice === null ? (
                  <span className="inline-block h-8 w-48 bg-gray-300 rounded animate-pulse"></span>
                ) : (
                  <>{formatINR(totalPrice)}</>
                )}
              </p>
            </div>

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

              {/* Ring Size Dropdown */}
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

                  <p
                    className="text-sm text-gray-600 underline cursor-pointer mt-2"
                    onClick={() => setShowSizeGuide(true)}
                  >
                    View Size Guide
                  </p>

                  {/* ENGRAVING FIELD */}
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

              {/* Bracelet Size Dropdown */}
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
            <div className="flex items-center gap-3 mt-4">
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

            {/* Add to Cart & Buy Now */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={addToCart}
                disabled={!priceBreakdown}
                className="flex-1 cursor-pointer bg-black text-white py-3 rounded-full flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart size={20} />
                {priceBreakdown ? "Add to Cart" : "Calculating..."}
              </button>
              <button
                onClick={buyNow}
                disabled={!priceBreakdown}
                className="flex-1 cursor-pointer bg-[#0a1833] text-white py-3 rounded-full flex items-center justify-center gap-2 hover:bg-[#0a1833]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap size={20} />
                {priceBreakdown ? "Buy Now" : "Calculating..."}
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

        {/* Tabs / Accordion with Price Breakdown */}
        <ProductAccordion
          product={product}
          selectedOptions={selectedOptions}
          selectedVariant={selectedVariant}
          onPriceData={handlePriceData}
        />

        {/* Customer Reviews */}
        <div className="mt-12 border-t pt-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-[#0a1833]">Customer Reviews</h2>
              {reviews.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)} avg · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowReviewModal(true)}
              className="text-sm bg-[#0a1833] text-white px-5 py-2 rounded-full hover:bg-[#1a2f5a] transition"
            >
              Write a Review
            </button>
          </div>

          {reviews.length === 0 ? (
            <p className="text-gray-400 text-sm">No reviews yet. Be the first to share your experience.</p>
          ) : (
            <div className="space-y-5 max-h-[520px] overflow-y-auto pr-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
              {reviews.map((r) => (
                <div key={r.id} className="border border-gray-100 rounded-2xl p-5 bg-gray-50">
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-2">
                    {Array.from({ length: 5 }).map((_, s) => {
                      const full = s + 1 <= Math.floor(r.rating);
                      const partial = !full && s < r.rating;
                      const fill = partial ? Math.round((r.rating - s) * 100) : 0;
                      const style = full
                        ? { color: "#c9a84c" }
                        : partial
                        ? {
                            background: `linear-gradient(to right, #c9a84c ${fill}%, #d1d5db ${fill}%)`,
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                          }
                        : { color: "#d1d5db" };
                      return <span key={s} className="text-lg" style={style}>★</span>;
                    })}
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">&ldquo;{r.text}&rdquo;</p>

                  {/* Review image thumbnail */}
                  {r.image_url && (
                    <button
                      type="button"
                      onClick={() => setLightboxUrl(r.image_url)}
                      className="mb-3 block"
                    >
                      <img
                        src={r.image_url}
                        alt="Customer photo"
                        className="h-20 w-20 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition"
                      />
                    </button>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="font-medium text-gray-600">{r.name}{r.location ? ` · ${r.location}` : ""}</span>
                    <span>{new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Related Products */}
        <RelatedProducts productId={product.id} />
      </div>

      {/* Review Image Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white"
            >
              <X size={28} />
            </button>
            <img src={lightboxUrl} alt="Review photo" className="w-full max-h-[80vh] object-contain rounded-xl" />
          </div>
        </div>
      )}

      {/* Review Submission Modal */}
      {showReviewModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowReviewModal(false); }}
        >
          {/* Mobile: full-width bottom sheet · Desktop: centered card */}
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col max-h-[92dvh] sm:max-h-[90vh]">

            {/* Drag handle (mobile only) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 sm:px-6 sm:pt-5 border-b border-gray-100">
              <h3 className="text-base sm:text-lg font-semibold text-[#0a1833]">Write a Review</h3>
              <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable form body */}
            <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4" style={{ scrollbarWidth: "thin" }}>
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              {/* Star rating — slider for precise decimal input */}
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Rating <span className="text-red-400">*</span>
                  {reviewForm.rating > 0 && (
                    <span className="ml-2 text-[#c9a84c] font-semibold">{reviewForm.rating.toFixed(1)} / 5.0</span>
                  )}
                </p>

                {/* Star display */}
                <div className="flex gap-0.5 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const fill = Math.round(Math.min(1, Math.max(0, reviewForm.rating - (star - 1))) * 100);
                    return (
                      <span key={star} className="relative inline-block text-3xl leading-none w-8">
                        <span style={{ color: "#d1d5db" }}>★</span>
                        {fill > 0 && (
                          <span
                            className="absolute inset-0 overflow-hidden"
                            style={{ width: `${fill}%`, color: "#c9a84c" }}
                          >
                            ★
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>

                {/* Slider — 1.0 to 5.0, step 0.1 */}
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.1"
                  value={reviewForm.rating || 1}
                  onChange={(e) => setReviewForm((p) => ({ ...p, rating: parseFloat(e.target.value) }))}
                  className="w-full accent-[#c9a84c]"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1.0</span><span>2.0</span><span>3.0</span><span>4.0</span><span>5.0</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Name <span className="text-red-400">*</span></label>
                  <input
                    value={reviewForm.name}
                    onChange={(e) => setReviewForm((p) => ({ ...p, name: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0a1833]"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Location <span className="text-gray-400">(optional)</span></label>
                  <input
                    value={reviewForm.location}
                    onChange={(e) => setReviewForm((p) => ({ ...p, location: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0a1833]"
                    placeholder="City"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600">Review <span className="text-red-400">*</span></label>
                <textarea
                  value={reviewForm.text}
                  onChange={(e) => setReviewForm((p) => ({ ...p, text: e.target.value }))}
                  rows={4}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0a1833] resize-none"
                  placeholder="Share your experience with this product..."
                />
              </div>

              {/* Optional image upload */}
              <div>
                <label className="text-sm text-gray-600">Photo </label>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-[#0a1833] file:text-white hover:file:bg-[#1a2f5a] cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setReviewImageFile(file);
                    const reader = new FileReader();
                    reader.onload = (ev) => setReviewImagePreview(ev.target.result);
                    reader.readAsDataURL(file);
                  }}
                />
                {reviewImagePreview && (
                  <div className="mt-2 relative inline-block">
                    <img src={reviewImagePreview} alt="Preview" className="h-24 w-24 object-cover rounded-lg border border-gray-200" />
                    <button
                      type="button"
                      onClick={() => { setReviewImageFile(null); setReviewImagePreview(null); }}
                      className="absolute -top-2 -right-2 bg-white border border-gray-200 rounded-full p-0.5 text-gray-500 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={reviewSubmitting}
                className="w-full bg-[#0a1833] text-white py-3 rounded-full text-sm font-semibold hover:bg-[#1a2f5a] transition disabled:opacity-50"
              >
                {reviewSubmitting ? "Submitting..." : "Submit Review"}
              </button>
            </form>
            </div>{/* end scrollable body */}
          </div>{/* end card */}
        </div>
      )}

      {/* Full Screen Modal */}
      {isModalOpen && (
        <div
          ref={modalRef}
          className="fixed inset-0 bg-white z-50 flex items-center justify-center overflow-hidden touch-none"
          onKeyDown={handleKeyDown}
          tabIndex={0}
          onClick={(e) => {
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
          <button
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 text-black hover:text-gray-300 transition-colors z-10"
            aria-label="Close modal"
          >
            <X size={32} />
          </button>

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

          <img
            src={
              selectedImage ||
              selectedVariant?.image?.url ||
              product.featuredImage?.url
            }
            alt={product.title}
            className="h-[90vh] max-w-[90vw] object-contain p-4 rounded-lg"
          />

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
                    Make sure it's snug but not tight, then mark the spot where
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
              <>
                <h2 className="text-2xl font-semibold mb-4 text-center">
                  Bracelet Size Guide
                </h2>
                <img
                  src="/bt_size_guide.jpg"
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
