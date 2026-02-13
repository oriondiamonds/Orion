import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, CircleCheckBig } from "lucide-react";
import PriceBreakup from "./PriceBreakup";
/* ---------- DIAMOND DETAILS ---------- */
/* ---------- DIAMOND DETAILS ---------- */
function DiamondDetails({ descriptionHtml }) {
  const [diamondData, setDiamondData] = useState([]);

  useEffect(() => {
    if (descriptionHtml) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(descriptionHtml, "text/html");
      const liElements = doc.querySelectorAll(".product-description ul li");
      const paragraphs = doc.querySelectorAll(".product-description p");

      const specMap = {};
      liElements.forEach((li) => {
        const key = li
          .querySelector("strong")
          ?.textContent.replace(":", "")
          .trim();
        const value = li.textContent
          .replace(li.querySelector("strong")?.textContent || "", "")
          .trim();
        if (key && value) {
          specMap[key] = value;
        }
      });

      // Extract dimensions from paragraphs
      paragraphs.forEach((p) => {
        const strongEl = p.querySelector("strong");
        if (strongEl) {
          const key = strongEl.textContent.replace(":", "").trim();
          const value = p.textContent.replace(strongEl.textContent, "").trim();
          if (key === "Dimensions" && value) {
            specMap[key] = value;
          }
        }
      });

      // Extract relevant values
      const shapes =
        specMap["Diamond Shape"]?.split(",").map((v) => v.trim()) || [];
      const weights =
        specMap["Diamond Weight"]?.split(",").map((v) => v.trim()) || [];
      const numbers =
        specMap["Total Diamonds"]?.split(",").map((v) => v.trim()) || [];
      const totalWeights =
        specMap["Total Diamond Weight"]?.split(",").map((v) => v.trim()) || [];
      const dimensions =
        specMap["Dimensions"]?.split(",").map((v) => v.trim()) || [];

      // Determine number of rows (based on max array length)
      const rowCount = Math.max(
        shapes.length,
        weights.length,
        numbers.length,
        totalWeights.length,
        dimensions.length,
      );

      const rows = Array.from({ length: rowCount }, (_, i) => ({
        shape: shapes[i] || "-",
        weight: weights[i] || "-",
        number: numbers[i] || "-",
        totalWeight: totalWeights[i] || "-",
        dimensions: dimensions[i] || "-",
      }));

      setDiamondData(rows);
    }
  }, [descriptionHtml]);

  if (!diamondData.length) return <p>No diamond details available.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border border-gray-200">
        <thead className="bg-gray-100 text-gray-800">
          <tr>
            <th className="py-2 px-3 text-left font-semibold border-b border-gray-200">
              Shape
            </th>
            <th className="py-2 px-3 text-left font-semibold border-b border-gray-200">
              Weight (ct)
            </th>
            <th className="py-2 px-3 text-left font-semibold border-b border-gray-200">
              Dimensions (mm)
            </th>
            <th className="py-2 px-3 text-left font-semibold border-b border-gray-200">
              Number
            </th>
            <th className="py-2 px-3 text-left font-semibold border-b border-gray-200">
              Total Weight (ct)
            </th>
          </tr>
        </thead>
        <tbody>
          {diamondData.map((row, idx) => (
            <tr
              key={idx}
              className="odd:bg-white even:bg-gray-50 hover:bg-white/60 transition-colors"
            >
              <td className="py-2 px-3 text-gray-800">{row.shape}</td>
              <td className="py-2 px-3 text-gray-700">{row.weight}</td>
              <td className="py-2 px-3 text-gray-700">{row.dimensions}</td>
              <td className="py-2 px-3 text-gray-700">{row.number}</td>
              <td className="py-2 px-3 text-gray-700">{row.totalWeight}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- PRODUCT DETAILS ---------- */
function ProductSpecs({
  descriptionHtml,
  selectedOptions,
  selectedVariant,
  options,
  pricing,
}) {
  const [specs, setSpecs] = useState([]);
  const [goldWeight, setGoldWeight] = useState(null);

  useEffect(() => {
    if (!descriptionHtml) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(descriptionHtml, "text/html");
    const liElements = doc.querySelectorAll(".product-description ul li");
    const paragraphs = doc.querySelectorAll(".product-description p");

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

    // ✅ Determine selected gold karat (e.g., "10K", "14K", etc.)
    const selectedKarat = selectedOptions["Gold Karat"] || "";
    const karatNum = parseInt(selectedKarat);

    // ✅ Prefer synced weight from product_prices, fallback to description HTML
    const syncedWeight = pricing && pricing[`weight_${karatNum}k`]
      ? `${pricing[`weight_${karatNum}k`]}g`
      : null;

    if (syncedWeight) {
      setGoldWeight(syncedWeight);
    } else {
      // Fallback: extract from description HTML
      const weightKey =
        Object.keys(specMap).find(
          (key) =>
            key.toLowerCase().includes(selectedKarat.toLowerCase()) &&
            key.toLowerCase().includes("gold"),
        ) || null;
      setGoldWeight(weightKey ? specMap[weightKey] : null);
    }

    // ✅ Exclude all karat weights regardless of selected one
    const excludeKeys = [
      "Diamond Shape",
      "Total Diamonds",
      "Diamond Weight",
      "Total Diamond Weight",
      "Diamond Grade",
      "Gold Purity",
      "9K Weight",
      "14K Weight",
      "18K Weight",
      "10K Gold",
      "9K Gold",
      "14K Gold",
      "18K Gold",
      "Silver",
      "Platinum",
      "Dimensions",
      "Dimensions",
    ];

    // ✅ Parse main list items
    const parsedSpecs = Array.from(liElements)
      .map((li) => {
        const key = li
          .querySelector("strong")
          ?.textContent.replace(":", "")
          .trim();
        const value = li.textContent
          .replace(li.querySelector("strong")?.textContent || "", "")
          .trim();
        return { key, value };
      })
      .filter(
        (spec) =>
          spec.key &&
          !excludeKeys.includes(spec.key) && // remove diamond + gold weight keys
          !(
            spec.key.toLowerCase().includes("gold") &&
            spec.key.toLowerCase().match(/\d{1,2}k/)
          ), // remove any key with “9k”, “10k”, etc.
      );

    // ✅ Add size/dimensions (only if they have values)
    paragraphs.forEach((p) => {
      const strongEl = p.querySelector("strong");
      if (strongEl) {
        const key = strongEl.textContent.replace(":", "").trim();
        const value = p.textContent.replace(strongEl.textContent, "").trim();
        if (["Size"].includes(key) && value) {
          parsedSpecs.push({ key, value });
        }
      }
    });

    setSpecs(parsedSpecs);
  }, [descriptionHtml, selectedOptions, pricing]);

  if (!specs.length && !goldWeight) return <p>No product details available.</p>;

  const selectedKarat = selectedOptions["Gold Karat"] || "";

  return (
    <div className="space-y-1">
      {/* Product Details */}
      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-200">
          {specs.map((spec) => (
            <tr key={spec.key} className="hover:bg-white/50 transition-colors">
              <td className="py-3 font-semibold text-gray-800 w-1/3">
                {spec.key}
              </td>
              <td className="py-3 text-gray-700">{spec.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Product variant details */}
      <table className="w-full text-sm border-t border-gray-200 mt-3">
        <tbody className="divide-y divide-gray-200">
          {[...options].reverse().map((opt) => (
            <tr key={opt.name} className="hover:bg-white/50 transition-colors">
              <td className="py-3 font-semibold text-gray-800 w-1/3">
                {opt.name}
              </td>
              <td className="py-3 text-gray-700">
                {selectedOptions[opt.name]}
              </td>
            </tr>
          ))}

          {/* ✅ Show correct Gold Karat Weight only */}
          {goldWeight && (
            <tr className="hover:bg-white/50 transition-colors border-b border-gray-200">
              <td className="py-3 font-semibold text-gray-800 w-1/3">
                Gold Weight
              </td>
              <td className="py-3 text-gray-700">
                {goldWeight.endsWith("g") ? goldWeight : `${goldWeight}g`}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- MAIN ACCORDION ---------- */
export default function ProductAccordion({
  product,
  selectedOptions,
  selectedVariant,
  onPriceData,
}) {
  const [openTab, setOpenTab] = useState("diamond"); // default open first tab

  const toggleTab = (key) => setOpenTab(openTab === key ? null : key);

  const tabs = [
    {
      key: "diamond",
      label: "DIAMOND DETAILS",
      content: <DiamondDetails descriptionHtml={product.descriptionHtml} />,
    },
    {
      key: "product",
      label: "PRODUCT DETAILS",
      content: (
        <ProductSpecs
          descriptionHtml={product.descriptionHtml}
          selectedOptions={selectedOptions}
          selectedVariant={selectedVariant}
          options={product.options}
          pricing={product.pricing}
        />
      ),
    },
    {
      key: "price",
      label: "PRICE BREAKUP",
      content: (
        <PriceBreakup
          descriptionHtml={product.descriptionHtml}
          selectedOptions={selectedOptions}
          onPriceData={onPriceData}
          pricing={product.pricing}
        />
      ),
    },
    ,
    {
      key: "shipping",
      label: "PAYMENT & SHIPPING",
      content: (
        <div className="space-y-2">
          <p className="text-gray-700 font-medium flex items-center gap-2">
            <CircleCheckBig className="w-4 h-4 shrink-0" />
            Free shipping
          </p>
          <p className="text-gray-600 flex items-center gap-2">
            <CircleCheckBig className="w-4 h-4 shrink-0" />
            Delivery in 15-21 days at your doorstep
          </p>
          <p className="text-gray-600 flex items-center gap-2">
            <CircleCheckBig className="w-4 h-4 shrink-0" />
            Secure payment via trusted gateways
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="mt-10 border border-gray-200 rounded-xl overflow-hidden">
      {tabs.map((tab, index) => (
        <div
          key={tab.key}
          className={index !== 0 ? "border-t border-gray-200" : ""}
        >
          <button
            className="w-full flex justify-between items-center px-6 py-4 text-left font-semibold text-gray-900 hover:bg-gray-50 transition-colors duration-200 group"
            onClick={() => toggleTab(tab.key)}
          >
            <span className="text-sm tracking-wide">{tab.label}</span>
            {openTab === tab.key ? (
              <ChevronUp size={20} className="stroke-2 text-gray-500" />
            ) : (
              <ChevronDown size={20} className="stroke-2 text-gray-500" />
            )}
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              openTab === tab.key
                ? "max-h-[800px] opacity-100"
                : "max-h-0 opacity-0"
            }`}
          >
            <div className="px-6 py-5 text-gray-600 text-sm leading-relaxed bg-gray-50">
              {tab.content}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
