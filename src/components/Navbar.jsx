"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  FiSearch,
  FiShoppingCart,
  FiHeart,
  FiUser,
  FiMenu,
  FiX,
  FiPhone,
} from "react-icons/fi";
import { Loader, X } from "lucide-react";
import { searchProducts } from "../queries/search";

export function Navbar() {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isHero, setIsHero] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const mobileSearchRef = useRef(null);
  const desktopSearchRef = useRef(null);
  const searchRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();

  // === Handle mounting and screen size ===
  useEffect(() => {
    setIsMounted(true);

    const handleResize = () => {
      setIsMobile(window.innerWidth < 780);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // === Outside click closes dropdown ===
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // === Debounced search ===
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 2) performSearch(searchQuery);
      else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = async (query) => {
    try {
      setIsSearching(true);
      const response = await searchProducts(query, 10);
      const edges = response?.products?.edges || [];
      setSearchResults(edges);
      setShowResults(edges.length > 0);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowResults(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  };

  const handleResultClick = () => {
    setSearchQuery("");
    setShowResults(false);
  };

  // === Focus behavior ===
  useEffect(() => {
    if (mobileSearchOpen) mobileSearchRef.current?.focus();
  }, [mobileSearchOpen]);

  useEffect(() => {
    if (desktopSearchOpen) desktopSearchRef.current?.focus();
  }, [desktopSearchOpen]);

  // === Hero transparency ===
  useEffect(() => {
    if (pathname !== "/") {
      setIsHero(false);
      return;
    }
    const handleScroll = () => {
      const hero = document.getElementById("hero");
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      setIsHero(rect.top >= -50 && rect.bottom > 100);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  // === Sync Cart & Wishlist Counts ===
  useEffect(() => {
    const updateCounts = () => {
      if (typeof window === "undefined") return;
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
      setCartCount(cart.length);
      setWishlistCount(wishlist.length);
    };

    updateCounts();
    window.addEventListener("cartUpdated", updateCounts);
    window.addEventListener("wishlistUpdated", updateCounts);

    return () => {
      window.removeEventListener("cartUpdated", updateCounts);
      window.removeEventListener("wishlistUpdated", updateCounts);
    };
  }, []);

  // === Scroll to section ===
  const goToSection = (section) => {
    const offset = 100;
    setMobileMenuOpen(false);

    const scrollWithOffset = () => {
      const el = document.getElementById(section);
      if (el) {
        const y = el.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    };

    if (pathname !== "/") {
      router.push("/");
      setTimeout(scrollWithOffset, 100);
    } else {
      scrollWithOffset();
    }
  };

  return (
    <div
      className={`fixed w-full z-40 top-0 left-0 transition-colors duration-300 ${
        pathname === "/"
          ? isHero
            ? hovering
              ? "bg-[#0a1833]"
              : "bg-transparent"
            : "bg-[#0a1833]"
          : "bg-[#0a1833]"
      }`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      ref={searchRef}
    >
      {/* === NAVBAR TOP === */}
      <div className="p-4 flex items-center justify-between relative">
        {/* === LOGO === */}
        <div onClick={() => goToSection("hero")} className="cursor-pointer">
          <img
            src="/nobglogo.png"
            alt="Logo"
            className="h-12 w-auto object-contain"
          />
        </div>

        {/* === NAVBAR RIGHT ICONS === */}
        <div className="flex items-center gap-2 sm:gap-3 relative">
          {/* === DESKTOP SEARCH === */}
          {isMounted && !isMobile && (
            <div className="relative flex items-center">
              <FiSearch
                size={20}
                className="text-white cursor-pointer shrink-0 hover:text-yellow-400 transition"
                onClick={() => setDesktopSearchOpen(!desktopSearchOpen)}
              />
              {desktopSearchOpen && (
                <form
                  onSubmit={handleSearchSubmit}
                  className="relative ml-2 flex items-center"
                >
                  <input
                    type="text"
                    ref={desktopSearchRef}
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() =>
                      searchResults.length > 0 && setShowResults(true)
                    }
                    className="px-3 py-1 outline-none text-white bg-transparent border-b border-gray-400 placeholder-gray-300 w-56"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                  {isSearching && (
                    <Loader className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                  )}
                </form>
              )}
            </div>
          )}

          {/* === CALL BUTTON (DESKTOP) === */}
          <a
            href="tel:+917022253092"
            className="hidden md:flex items-center justify-center text-white hover:text-yellow-400 transition"
          >
            <FiPhone size={20} />
          </a>

          {/* === CART (DESKTOP ONLY) === */}
          <div className="hidden md:block relative">
            <FiShoppingCart
              size={20}
              className="text-white cursor-pointer hover:text-yellow-400 transition"
              onClick={() => router.push("/my-cart")}
            />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-yellow-500 text-[#0a1833] text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {cartCount}
              </span>
            )}
          </div>

          {/* === WISHLIST (DESKTOP ONLY) === */}
          <div className="hidden md:block relative">
            <FiHeart
              size={20}
              className="text-white cursor-pointer hover:text-red-500 transition"
              onClick={() => router.push("/my-list")}
            />
            {wishlistCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {wishlistCount}
              </span>
            )}
          </div>

          {/* === USER (DESKTOP ONLY) === */}
          <FiUser
            size={20}
            className="hidden md:block text-white cursor-pointer hover:text-green-400 transition"
            onClick={() => router.push("/account")}
          />

          {/* === MOBILE: CART + HAMBURGER === */}
          <div className="md:hidden flex items-center gap-3">
            {/* Mobile Cart Icon */}
            <div
              className="relative cursor-pointer"
              onClick={() => router.push("/my-cart")}
            >
              <FiShoppingCart
                size={20}
                className="text-white hover:text-yellow-400 transition"
              />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-yellow-500 text-[#0a1833] text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {cartCount}
                </span>
              )}
            </div>

            {/* Hamburger Menu Toggle */}
            {mobileMenuOpen ? (
              <FiX
                size={24}
                className="text-white cursor-pointer"
                onClick={() => setMobileMenuOpen(false)}
              />
            ) : (
              <FiMenu
                size={24}
                className="text-white cursor-pointer"
                onClick={() => setMobileMenuOpen(true)}
              />
            )}
          </div>
        </div>
      </div>

      {/* === NAV LINKS (DESKTOP) === */}
      <div className="hidden md:flex justify-center gap-6 md:gap-12 py-2 text-white font-medium text-sm md:text-base">
        {[
          { label: "Home", id: "hero" },
          { label: "Collection", id: "collections" },
          { label: "About Us", id: "about" },
          { label: "Customizations", id: "customizations" },
          { label: "FAQs", id: "faqs" },
          { label: "Contact Us", id: "contact" },
        ].map((link) => (
          <button
            key={link.id}
            onClick={() => goToSection(link.id)}
            className="no-underline hover:underline transition cursor-pointer"
          >
            {link.label}
          </button>
        ))}
      </div>

      {/* === SEARCH RESULTS (DESKTOP) === */}
      {isMounted && !isMobile && showResults && searchResults.length > 0 && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
          <div className="p-2">
            {searchResults.map(({ node: product }) => (
              <Link
                key={product.id}
                href={`/product/${product.handle}`}
                onClick={handleResultClick}
                className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden">
                  <img
                    src={product.featuredImage?.url || "/placeholder.jpg"}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate">
                    {product.title}
                  </h4>
                </div>
              </Link>
            ))}
          </div>
          <div className="border-t p-3 bg-gray-50 text-center">
            <button
              onClick={(e) => {
                e.preventDefault();
                router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
                setShowResults(false);
              }}
              className="text-sm text-black font-medium hover:underline"
            >
              View all results for "{searchQuery}"
            </button>
          </div>
        </div>
      )}

      {/* === NO RESULTS (DESKTOP) === */}
      {isMounted &&
        !isMobile &&
        showResults &&
        !isSearching &&
        searchQuery.length > 2 &&
        searchResults.length === 0 && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white border border-gray-200 rounded-lg shadow-xl p-6 text-center z-50">
            <p className="text-gray-600">
              No products found for "{searchQuery}"
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Try different keywords or browse our collections
            </p>
          </div>
        )}

      {/* === MOBILE MENU === */}
      {mobileMenuOpen && (
        <div className="md:hidden flex flex-col bg-[#0a1833] text-white">
          {/* Mobile Icons Section */}
          <div className="flex items-center justify-around py-4 px-4 border-b border-gray-700">
            {/* Search Icon */}
            <div className="flex flex-col items-center gap-1">
              <FiSearch
                size={22}
                className="text-white cursor-pointer hover:text-yellow-400 transition"
                onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              />
              <span className="text-xs">Search</span>
            </div>

            {/* Phone Icon */}
            <a
              href="tel:+917022253092"
              className="flex flex-col items-center gap-1 cursor-pointer text-white hover:text-yellow-400 transition"
            >
              <FiPhone size={22} />
              <span className="text-xs">Call Us</span>
            </a>

            {/* Wishlist Icon */}
            <div
              className="flex flex-col items-center gap-1 relative cursor-pointer"
              onClick={() => {
                router.push("/my-list");
                setMobileMenuOpen(false);
              }}
            >
              <FiHeart
                size={22}
                className="text-white hover:text-red-500 transition"
              />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {wishlistCount}
                </span>
              )}
              <span className="text-xs">Wishlist</span>
            </div>

            {/* User Icon */}
            <div
              className="flex flex-col items-center gap-1 cursor-pointer"
              onClick={() => {
                router.push("/account");
                setMobileMenuOpen(false);
              }}
            >
              <FiUser
                size={22}
                className="text-white hover:text-green-400 transition"
              />
              <span className="text-xs">Account</span>
            </div>
          </div>

          {/* Mobile Search Bar (if opened) */}
          {mobileSearchOpen && (
            <div className="px-4 py-3 border-b border-gray-700">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  ref={mobileSearchRef}
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() =>
                    searchResults.length > 0 && setShowResults(true)
                  }
                  className="w-full px-3 py-2 pr-8 outline-none text-white rounded-lg bg-[#0a1833] border border-gray-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                )}
                {isSearching && (
                  <Loader className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                )}
              </form>

              {/* Mobile Search Results */}
              {showResults && searchResults.length > 0 && (
                <div className="mt-3 bg-white rounded-lg shadow-xl max-h-80 overflow-y-auto">
                  <div className="p-2">
                    {searchResults.map(({ node: product }) => (
                      <Link
                        key={product.id}
                        href={`/product/${product.handle}`}
                        onClick={() => {
                          handleResultClick();
                          setMobileMenuOpen(false);
                          setMobileSearchOpen(false);
                        }}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden shrink-0">
                          <img
                            src={
                              product.featuredImage?.url || "/placeholder.jpg"
                            }
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm truncate">
                            {product.title}
                          </h4>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <div className="border-t p-2 bg-gray-50 text-center">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        router.push(
                          `/search?q=${encodeURIComponent(searchQuery)}`
                        );
                        setShowResults(false);
                        setMobileMenuOpen(false);
                        setMobileSearchOpen(false);
                      }}
                      className="text-xs text-black font-medium hover:underline"
                    >
                      View all results for "{searchQuery}"
                    </button>
                  </div>
                </div>
              )}

              {/* Mobile No Results */}
              {showResults &&
                !isSearching &&
                searchQuery.length > 2 &&
                searchResults.length === 0 && (
                  <div className="mt-3 bg-white rounded-lg shadow-xl p-4 text-center">
                    <p className="text-gray-600 text-sm">
                      No products found for "{searchQuery}"
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Try different keywords or browse our collections
                    </p>
                  </div>
                )}
            </div>
          )}

          {/* Navigation Links */}
          <div className="flex flex-col items-center font-medium text-base py-4 gap-4">
            {[
              { label: "Home", id: "hero" },
              { label: "Collection", id: "collections" },
              { label: "About Us", id: "about" },
              { label: "Customizations", id: "customizations" },
              { label: "FAQs", id: "faqs" },
              { label: "Contact Us", id: "contact" },
            ].map((link) => (
              <button
                key={link.id}
                onClick={() => goToSection(link.id)}
                className="no-underline hover:underline transition cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
