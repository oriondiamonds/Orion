// utils/productPriceCalculator.js
import { calculateFinalPrice } from "./price";

// Cache for storing calculated prices
const priceCache = new Map();

/**
 * Extract specifications from description (handles both HTML and plain text)
 */
const parseDescription = (description) => {
  const specMap = {};

  // Try HTML parsing first
  if (description.includes("<") && description.includes(">")) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(description, "text/html");
      const liElements = doc.querySelectorAll(
        "ul li, .product-description ul li"
      );

      liElements.forEach((li) => {
        const strongText = li.querySelector("strong")?.textContent || "";
        const key = strongText.replace(":", "").trim();
        const value = li.textContent.replace(strongText, "").trim();
        if (key && value) specMap[key] = value;
      });

      // If we found specs, return them
      if (Object.keys(specMap).length > 0) {
        return specMap;
      }
    } catch (e) {
      console.log("HTML parsing failed, falling back to regex");
    }
  }

  // Fall back to regex parsing for plain text
  const lines = description.split("\n");

  lines.forEach((line) => {
    // Match patterns like "Key: Value" or "Key:Value"
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      const key = match[1].trim().replace(/\*/g, ""); // Remove asterisks
      const value = match[2].trim();
      if (key && value) {
        specMap[key] = value;
      }
    }
  });

  // Also try direct regex matches for specific fields
  if (!specMap["Diamond Shape"]) {
    const shapeMatch = description.match(/Diamond Shape:\s*([^\n]+)/i);
    if (shapeMatch) specMap["Diamond Shape"] = shapeMatch[1].trim();
  }

  if (!specMap["Total Diamonds"]) {
    const countMatch = description.match(/Total Diamonds:\s*([\d,\s]+)/i);
    if (countMatch) specMap["Total Diamonds"] = countMatch[1].trim();
  }

  if (!specMap["Diamond Weight"]) {
    const weightMatch = description.match(/Diamond Weight:\s*([\d.,\s]+)/i);
    if (weightMatch) specMap["Diamond Weight"] = weightMatch[1].trim();
  }

  // Try to find gold weight for any karat
  ["10K", "14K", "18K", "22K", "24K"].forEach((karat) => {
    const key = `${karat} Gold`;
    if (!specMap[key]) {
      const goldMatch = description.match(
        new RegExp(`${karat}\\s+Gold:\\s*([\\d.]+)`, "i")
      );
      if (goldMatch) specMap[key] = goldMatch[1].trim() + "g";
    }
  });

  return specMap;
};

/**
 * Calculate product price from description
 */
export const calculateProductPrice = async (
  description,
  selectedKarat = "10K"
) => {
  try {
    // Create cache key
    const cacheKey = `${description.substring(0, 100)}-${selectedKarat}`;

    // Check cache first
    if (priceCache.has(cacheKey)) {
      return priceCache.get(cacheKey);
    }

    // Parse description to extract specifications
    const specMap = parseDescription(description);

    // Debug logging
    console.log("Parsed specs:", specMap);

    // Extract diamond data
    const shapes =
      specMap["Diamond Shape"]?.split(",").map((v) => v.trim()) || [];
    const weights =
      specMap["Diamond Weight"]?.split(",").map((v) => v.trim()) || [];
    const countRaw = specMap["Diamond Count"] || specMap["Total Diamonds"] || "";
    const counts = countRaw.split(",").map((v) => v.trim());

    const diamonds = shapes.map((shape, i) => ({
      shape,
      weight: parseFloat(weights[i]) || 0,
      count: parseInt(counts[i]) || 0,
    }));

    // Extract gold weight
    const goldWeightKey = Object.keys(specMap).find((key) =>
      key.toLowerCase().includes(selectedKarat.toLowerCase())
    );

    let goldWeight = 0;
    if (goldWeightKey && specMap[goldWeightKey]) {
      // Remove 'g' or 'gm' suffix and parse
      goldWeight =
        parseFloat(specMap[goldWeightKey].replace(/g|gm/gi, "").trim()) || 0;
    }

    console.log("Extracted data:", {
      diamonds,
      goldWeight,
      goldKarat: selectedKarat,
    });

    // Calculate price
    const result = await calculateFinalPrice({
      diamonds,
      goldWeight,
      goldKarat: selectedKarat,
    });

    console.log("Calculated price:", result.totalPrice);

    const price = result.totalPrice;

    // Cache the result
    priceCache.set(cacheKey, price);

    return price;
  } catch (error) {
    console.error("Error calculating price:", error);
    return 0;
  }
};

/**
 * Calculate prices for multiple products in batches
 */
export const calculateProductPricesBatch = async (
  products,
  selectedKarat = "10K",
  batchSize = 5
) => {
  const results = [];

  // Process in batches to avoid overwhelming the system
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((product) =>
        calculateProductPrice(product.description, selectedKarat)
      )
    );
    results.push(...batchResults);

    // Optional: Add a small delay between batches if needed
    // await new Promise(resolve => setTimeout(resolve, 50));
  }

  return results;
};

/**
 * Extract diamond details from description
 */
export const extractDiamondDetails = (description) => {
  const specMap = parseDescription(description);

  return {
    carat: specMap["Total Diamond Carat"] || "",
    quality: specMap["Diamond Quality"]?.trim() || "",
    shape: specMap["Diamond Shape"]?.trim() || "",
    count: specMap["Total Diamonds"] || "",
  };
};

/**
 * Clear the price cache (useful for refreshing data)
 */
export const clearPriceCache = () => {
  priceCache.clear();
};
