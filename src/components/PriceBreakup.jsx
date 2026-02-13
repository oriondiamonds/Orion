import { useEffect, useState } from "react";
import { calculateFinalPrice } from "../utils/price";
import { formatIndianCurrency, formatINR } from "../utils/formatIndianCurrency";

export default function PriceBreakup({
  descriptionHtml,
  selectedOptions,
  onPriceData,
  pricing,
}) {
  const [priceData, setPriceData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function computePrice() {
      if (!descriptionHtml && !pricing) return;
      setLoading(true);

      const selectedKarat = selectedOptions["Gold Karat"] || "18K";
      const karatNum = parseInt(selectedKarat);

      // Use synced product_prices data if available
      if (pricing && pricing.diamond_price && pricing[`weight_${karatNum}k`]) {
        try {
          const weightK = Number(pricing[`weight_${karatNum}k`]) || 0;
          const diamondPrice = Math.round(Number(pricing.diamond_price) || 0);

          // Fetch live 24K gold rate from Groww
          let gold24Price = 8500; // fallback
          try {
            const goldRes = await fetch("/api/gold-price");
            const goldData = await goldRes.json();
            if (goldData.success && goldData.price) {
              gold24Price = goldData.price;
            }
          } catch (e) {
            console.warn("Gold price fetch failed, using fallback");
          }

          const goldPrice = Math.round(gold24Price * (karatNum / 24) * weightK);

          const makingCharge = Math.round(
            (weightK >= 2 ? weightK * 700 : weightK * 950) * 1.75
          );

          const subtotal = diamondPrice + goldPrice + makingCharge;
          const gst = Math.round(subtotal * 0.03);
          const totalPrice = subtotal + gst;

          setPriceData({
            diamondPrice,
            goldPrice,
            makingCharge,
            subtotal,
            gst,
            totalPrice,
          });
          setLoading(false);
          return;
        } catch (e) {
          console.warn("Synced pricing failed, falling back to calculation");
        }
      }

      // Fallback: parse HTML and calculate client-side
      if (!descriptionHtml) {
        setLoading(false);
        return;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(descriptionHtml, "text/html");
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

      // extract diamond data
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

      // extract gold info
      const goldWeightKey = Object.keys(specMap).find((key) =>
        key.toLowerCase().includes(selectedKarat.toLowerCase()),
      );
      const goldWeight = parseFloat(specMap[goldWeightKey]) || 0;

      // calculate
      const result = await calculateFinalPrice({
        diamonds,
        goldWeight,
        goldKarat: selectedKarat,
      });

      setPriceData(result);
      setLoading(false);
    }

    computePrice();
  }, [descriptionHtml, selectedOptions, pricing]);

  useEffect(() => {
    if (priceData && onPriceData) {
      onPriceData(priceData); // send only after computation finishes
    }
  }, [priceData]); // dependency must be priceData, not onPriceData

  if (loading) return <p>Calculating price...</p>;
  if (!priceData) return <p>No price data available.</p>;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 text-gray-700 text-sm sm:text-base">
      <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
        <tbody>
          <tr className="border-b">
            <td className="py-2 px-3 font-semibold">Diamond Price</td>
            <td className="py-2 px-3 text-right">
              {formatINR(priceData.diamondPrice)}
            </td>
          </tr>
          <tr className="border-b">
            <td className="py-2 px-3 font-semibold">Gold Price</td>
            <td className="py-2 px-3 text-right">
              {formatINR(priceData.goldPrice)}
            </td>
          </tr>
          <tr className="border-b">
            <td className="py-2 px-3 font-semibold">Making Charges</td>
            <td className="py-2 px-3 text-right">
              {formatINR(priceData.makingCharge)}
            </td>
          </tr>
          <tr className="border-b">
            <td className="py-2 px-3 font-semibold">GST</td>
            <td className="py-2 px-3 text-right">{formatINR(priceData.gst)}</td>
          </tr>
          <tr className="bg-gray-50 font-semibold text-gray-900">
            <td className="py-2 px-3">Total Price</td>
            <td className="py-2 px-3 text-right">
              {formatINR(priceData.totalPrice)}
            </td>
          </tr>
        </tbody>
      </table>
      <h4>
        *Final weight may vary slightly. Any price difference will be
        communicated before dispatch.
      </h4>
    </div>
  );
}
