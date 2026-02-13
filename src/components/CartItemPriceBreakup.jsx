import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { calculateFinalPrice } from "../utils/price";
import { formatIndianCurrency } from "../utils/formatIndianCurrency";

export default function CartItemPriceBreakup({ item }) {
  const [isOpen, setIsOpen] = useState(false);
  const [priceData, setPriceData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Use stored breakdown from add-to-cart if available (matches displayed price)
    if (isOpen && !priceData) {
      if (item.priceBreakdown) {
        setPriceData(item.priceBreakdown);
        return;
      }

      // Fallback: recalculate from HTML description
      computePrice();
    }

    async function computePrice() {
      if (!item.descriptionHtml) return;
      setLoading(true);

      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(item.descriptionHtml, "text/html");
        const liElements = doc.querySelectorAll(".product-description ul li");

        const specMap = {};
        liElements.forEach((li) => {
          const key = li
            .querySelector("strong")
            ?.textContent.replace(":", "")
            .trim();
          const value = li.textContent
            .replace(li.querySelector("strong")?.textContent || "", "")
            .trim();
          if (key && value) specMap[key] = value;
        });

        // Extract diamond data
        const shapes =
          specMap["Diamond Shape"]?.split(",").map((v) => v.trim()) || [];
        const weights =
          specMap["Diamond Weight"]?.split(",").map((v) => v.trim()) || [];
        const counts =
          specMap["Total Diamonds"]?.split(",").map((v) => v.trim()) || [];

        const diamonds = shapes.map((shape, i) => ({
          shape,
          weight: parseFloat(weights[i]) || 0,
          count: parseInt(counts[i]) || 0,
        }));

        // Extract gold info
        const selectedKarat =
          item.selectedOptions?.find((opt) => opt.name === "Gold Karat")
            ?.value || "18K";
        const goldWeightKey = Object.keys(specMap).find((key) =>
          key.toLowerCase().includes(selectedKarat.toLowerCase())
        );
        const goldWeight = parseFloat(specMap[goldWeightKey]) || 0;

        // Calculate
        const result = await calculateFinalPrice({
          diamonds,
          goldWeight,
          goldKarat: selectedKarat,
        });

        setPriceData(result);
      } catch (error) {
        console.error("Error calculating price:", error);
      } finally {
        setLoading(false);
      }
    }
  }, [isOpen, item]);

  return (
    <div className="mt-3 border-t pt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <span className="font-medium">View Price Breakup</span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <div className="mt-3 bg-gray-50 rounded-lg p-3">
          {loading ? (
            <p className="text-sm text-gray-600">Calculating...</p>
          ) : priceData ? (
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 text-gray-600">Diamond Price</td>
                  <td className="py-1.5 text-right font-medium">
                    ₹{formatIndianCurrency(priceData.diamondPrice)}
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 text-gray-600">Gold Price</td>
                  <td className="py-1.5 text-right font-medium">
                    ₹{formatIndianCurrency(priceData.goldPrice)}
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 text-gray-600">Making Charges</td>
                  <td className="py-1.5 text-right font-medium">
                    ₹{formatIndianCurrency(priceData.makingCharge)}
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 text-gray-600">GST</td>
                  <td className="py-1.5 text-right font-medium">
                    ₹{formatIndianCurrency(priceData.gst)}
                  </td>
                </tr>
                <tr className="bg-gray-100 font-semibold">
                  <td className="py-1.5 text-gray-900">Total</td>
                  <td className="py-1.5 text-right text-gray-900">
                    ₹{formatIndianCurrency(priceData.totalPrice)}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-600">Price breakup not available</p>
          )}
        </div>
      )}
    </div>
  );
}
