"use client";

import {
  Heart,
  ChevronLeft,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatIndianCurrency, formatINR } from "../utils/formatIndianCurrency";
import { useSearchParams } from "next/navigation";

export default function CollectionSection({ id, title, items = [] }) {
  const router = useRouter();
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [sortBy, setSortBy] = useState("price-low");
  const [priceRange, setPriceRange] = useState([0, 500000]);
  const [karatFilter, setKaratFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const searchParams = useSearchParams();
  const initialPage = Number(searchParams.get("page")) || 1;
  const [currentPage, setCurrentPage] = useState(initialPage);

  // Extract unique gold karat values from all product variants
  const availableKarats = (() => {
    const karats = new Set();
    items.forEach((item) => {
      (item.allVariants || []).forEach((variant) => {
        const karatOpt = (variant.selectedOptions || []).find(
          (opt) => opt.name === "Gold Karat"
        );
        if (karatOpt) karats.add(karatOpt.value);
      });
    });
    return [...karats].sort((a, b) => parseInt(a) - parseInt(b));
  })();

  // Get the effective price for an item based on selected karat
  const getItemPrice = (item) => {
    if (karatFilter !== "all" && item.prices?.[karatFilter]) {
      return item.prices[karatFilter];
    }
    return item.price;
  };

  // Filter items by karat availability
  const karatFilteredItems =
    karatFilter === "all"
      ? items
      : items.filter((item) =>
          (item.allVariants || []).some((variant) =>
            (variant.selectedOptions || []).some(
              (opt) => opt.name === "Gold Karat" && opt.value === karatFilter
            )
          )
        );

  // Calculate min and max prices based on effective prices
  const minPrice =
    karatFilteredItems.length > 0
      ? Math.min(...karatFilteredItems.map(getItemPrice))
      : 0;
  const maxPrice =
    karatFilteredItems.length > 0
      ? Math.max(...karatFilteredItems.map(getItemPrice))
      : 500000;

  // Reset price range when items or karat changes
  useEffect(() => {
    if (karatFilteredItems.length > 0) {
      setPriceRange([
        Math.min(...karatFilteredItems.map(getItemPrice)),
        Math.max(...karatFilteredItems.map(getItemPrice)),
      ]);
    }
  }, [items, karatFilter]);

  // Handle responsive page size
  useEffect(() => {
    const updateItemsPerPage = () => {
      if (window.innerWidth < 768) setItemsPerPage(8);
      else setItemsPerPage(8);
    };
    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);
    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, []);

  // Filter items by price range (using effective prices)
  const filteredItems = karatFilteredItems.filter((item) => {
    const price = getItemPrice(item);
    return price >= priceRange[0] && price <= priceRange[1];
  });

  // Sort filtered items (using effective prices)
  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return getItemPrice(a) - getItemPrice(b);
      case "price-high":
        return getItemPrice(b) - getItemPrice(a);
      default:
        return 0;
    }
  });

  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = sortedItems.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);

      const url = new URL(window.location.href);
      url.searchParams.set("page", page);
      window.history.replaceState({}, "", url);

      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Reset to page 1 when filters/sort change
  useEffect(() => {
    setCurrentPage(initialPage);
  }, [sortBy, priceRange, karatFilter]);

  const handleResetFilters = () => {
    setSortBy("default");
    setPriceRange([minPrice, maxPrice]);
    setKaratFilter("all");
  };

  const isFiltered =
    sortBy !== "default" ||
    priceRange[0] !== minPrice ||
    priceRange[1] !== maxPrice ||
    karatFilter !== "all";

  const getProductUrl = (handle) => {
    if (karatFilter !== "all") {
      return `/product/${handle}?karat=${karatFilter}`;
    }
    return `/product/${handle}`;
  };

  return (
    <section className="mt-12 mb-12 px-3 md:px-0">
      {/* Section Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1
          id={id}
          className="text-4xl md:text-5xl font-bold text-[#0a1833] tracking-tight mb-4 md:mb-0"
        >
          {title}
        </h1>

        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="md:hidden flex items-center gap-2 px-4 py-2 bg-[#0a1833] text-white rounded-lg text-sm font-medium"
        >
          <SlidersHorizontal size={16} />
          Filters & Sort
        </button>
      </div>

      {/* Filter & Sort Bar */}
      <div
        className={`${
          showFilters ? "block" : "hidden"
        } md:flex flex-col md:flex-row gap-4 md:gap-6 mb-8 p-4 md:p-6 bg-gray-50 rounded-xl transition-all duration-300`}
      >
        {/* Sort By */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-[#0a1833] mb-2">
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a1833] bg-white text-sm"
          >
            <option value="default">Default</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>

        {/* Gold Karat Filter */}
        {availableKarats.length > 0 && (
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#0a1833] mb-2">
              Gold Karat
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setKaratFilter("all")}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  karatFilter === "all"
                    ? "bg-[#0a1833] text-white"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                All
              </button>
              {availableKarats.map((karat) => (
                <button
                  key={karat}
                  onClick={() => setKaratFilter(karat)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    karatFilter === karat
                      ? "bg-[#0a1833] text-white"
                      : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {karat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Price Range */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-[#0a1833] mb-2">
            Price Range: {formatINR(priceRange[0])} -{formatINR(priceRange[1])}
          </label>
          <div className="flex gap-3 items-center">
            <input
              type="number"
              value={priceRange[0]}
              onChange={(e) =>
                setPriceRange([Number(e.target.value), priceRange[1]])
              }
              placeholder="Min"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a1833] text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="number"
              value={priceRange[1]}
              onChange={(e) =>
                setPriceRange([priceRange[0], Number(e.target.value)])
              }
              placeholder="Max"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a1833] text-sm"
            />
          </div>
        </div>

        {/* Reset Filters */}
        {isFiltered && (
          <div className="flex items-end">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2.5 bg-white border border-gray-300 text-[#0a1833] rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <X size={16} />
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Results Count */}
      <p className="text-sm text-gray-600 mb-4">
        Showing {sortedItems.length} of {items.length} products
      </p>

      {/* Responsive Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-8 transition-all duration-500">
        {currentItems && currentItems.length > 0 ? (
          currentItems.map((item, idx) => (
            <div
              key={idx}
              className="group relative bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2 hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => router.push(getProductUrl(item.handle))}
            >
              {/* Image Container */}
              <div className="relative overflow-hidden bg-gray-50 aspect-4/5 md:aspect-square">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* View Button */}
                <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(getProductUrl(item.handle));
                    }}
                    className="w-full bg-white text-[#0a1833] py-2 md:py-2.5 px-3 md:px-4 rounded-lg md:rounded-xl font-medium text-xs md:text-sm flex items-center justify-center gap-2 hover:bg-[#0a1833] hover:text-white transition-all duration-300 shadow-lg"
                  >
                    <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    View Details
                  </button>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-3 md:p-5 flex flex-col justify-between min-h-[120px] md:min-h-[130px]">
                <h3 className="font-medium capitalize text-sm md:text-lg text-[#0a1833] group-hover:text-[#1a2f5a] transition-colors duration-300 leading-snug line-clamp-2 mb-2">
                  {item.name}
                </h3>

                {/* Price Display */}
                <div className="mt-auto">
                  {karatFilter !== "all" && (
                    <p className="text-xs md:text-sm text-gray-500 mb-1">
                      {karatFilter} Gold
                    </p>
                  )}
                  <p className="text-lg md:text-xl font-bold text-[#0a1833]">
                    {formatINR(getItemPrice(item))}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-16">
            <p className="text-lg text-gray-500 font-medium">
              No products found
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Try adjusting your filters
            </p>
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="mt-4 px-6 py-2 bg-[#0a1833] text-white rounded-lg hover:bg-[#142850] transition-colors text-sm font-medium"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-10">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-full border hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronLeft size={20} />
          </button>

          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => goToPage(i + 1)}
              className={`w-8 h-8 flex items-center justify-center rounded-full border text-sm font-medium ${
                currentPage === i + 1
                  ? "bg-black text-white border-black"
                  : "hover:bg-gray-100 text-gray-800 border-gray-300"
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-full border hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </section>
  );
}
