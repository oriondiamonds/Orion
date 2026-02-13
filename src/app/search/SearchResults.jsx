"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { searchProducts } from "../../queries/search";
import { calculateFinalPrice } from "../../utils/price";
import { formatIndianCurrency } from "../../utils/formatIndianCurrency";

export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    if (query) performSearch();
  }, [query]);

  const calculateProductPrice = async (description, selectedKarat = "10K") => {
    try {
      const diamondShapeMatch = description.match(
        /Diamond Shape:\s*([A-Za-z,\s]+?)(?=Total Diamonds|Diamond Weight|$)/i
      );
      const totalDiamondsMatch = description.match(
        /Total Diamonds:\s*([\d,\s]+?)(?=Diamond Weight|Total Diamond Weight|Metal Weights|$)/i
      );
      const diamondWeightMatch = description.match(
        /Diamond Weight:\s*([\d.,\s]+?)(?=Total Diamond Weight|Metal Weights|$)/i
      );
      const goldWeightMatch = description.match(
        new RegExp(`${selectedKarat} Gold:\\s*([\\d.]+)g`, "i")
      );

      const diamondShapes = diamondShapeMatch
        ? diamondShapeMatch[1]
            .trim()
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s)
        : [];

      const diamondCounts = totalDiamondsMatch
        ? totalDiamondsMatch[1]
            .trim()
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s && !isNaN(s))
            .map((c) => parseInt(c))
        : [];

      const diamondWeights = diamondWeightMatch
        ? diamondWeightMatch[1]
            .trim()
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s && !isNaN(s))
            .map((w) => parseFloat(w))
        : [];

      const goldWeight = goldWeightMatch ? parseFloat(goldWeightMatch[1]) : 0;

      const diamonds = diamondShapes.map((shape, i) => ({
        shape,
        weight: diamondWeights[i] || 0,
        count: diamondCounts[i] || 0,
      }));

      const result = await calculateFinalPrice({
        diamonds,
        goldWeight,
        goldKarat: selectedKarat,
      });

      return result.totalPrice;
    } catch (error) {
      console.error("Error calculating price:", error);
      return 0;
    }
  };

  const performSearch = async () => {
    try {
      setLoading(true);
      const response = await searchProducts(query, 50);

      if (response?.products?.edges) {
        // Transform products with price calculation
        const transformedProducts = await Promise.all(
          response.products.edges.map(async ({ node: product }) => {
            const firstVariant = product.variants?.edges?.[0]?.node;

            // Calculate actual price using pricing logic
            const calculatedPrice = await calculateProductPrice(
              product.description || "",
              "10K"
            );

            return {
              id: product.id,
              handle: product.handle,
              name: product.title,
              image:
                product.featuredImage?.url ||
                firstVariant?.image?.url ||
                "/placeholder.jpg",
              price: calculatedPrice,
              description: product.description || "",
            };
          })
        );

        setResults(transformedProducts);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(results.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = results.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-xl text-gray-700 animate-pulse">Searching...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 md:px-6 lg:px-8 py-10 md:py-25 mt-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[#0a1833] tracking-tight">
          Search Results for "{query}"
        </h1>
        <p className="text-gray-600 text-lg">
          {results.length} {results.length === 1 ? "product" : "products"} found
        </p>
      </div>

      {/* Results Grid */}
      {currentItems.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-8 transition-all duration-500">
            {currentItems.map((item) => (
              <div
                key={item.id}
                className="group relative bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2 hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => router.push(`/product/${item.handle}`)}
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
                        router.push(`/product/${item.handle}`);
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
                    <p className="text-xs md:text-sm text-gray-500 mb-1">
                      Starting from (10K Gold)
                    </p>
                    <p className="text-lg md:text-xl font-bold text-[#0a1833]">
                      ₹{formatIndianCurrency(item.price)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
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
        </>
      ) : (
        <div className="col-span-full flex flex-col items-center justify-center py-16">
          <p className="text-xl text-gray-700 mb-3">
            No products found for "{query}"
          </p>
          <p className="text-gray-500 mb-6">
            Try different keywords or browse our collections
          </p>
          <Link
            href="/rings"
            className="inline-block bg-black text-white px-6 py-3 rounded-full hover:bg-gray-800 transition-all duration-300"
          >
            Browse All Rings
          </Link>
        </div>
      )}
    </div>
  );
}
