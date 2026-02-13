// app/rings/page.jsx
import CollectionSection from "../../components/collectionsect";
import { getRingsCollection } from "../../queries/collections";
import { getSheetPricing } from "../../utils/sheetPricing";

// Cache for 1 hour
export const revalidate = 3600;

function extractDiamondDetails(description) {
  const caratMatch = description.match(/Total Diamond Carat:\s*([\d.]+)/);
  const qualityMatch = description.match(/Diamond Quality:\s*([^\n]+)/);
  const shapeMatch = description.match(/Diamond Shape:\s*([^\n]+)/);
  const countMatch = description.match(/Total Diamonds:\s*(\d+)/);

  return {
    carat: caratMatch?.[1] || "",
    quality: qualityMatch?.[1]?.trim() || "",
    shape: shapeMatch?.[1]?.trim() || "",
    count: countMatch?.[1] || "",
  };
}

async function transformRingsData(productsEdges) {
  const transformedProducts = await Promise.all(
    productsEdges.map(async ({ node: product }) => {
      const firstVariant = product.variants.edges[0]?.node;

      const goldKarat =
        firstVariant?.selectedOptions.find((opt) => opt.name === "Gold Karat")
          ?.value || "18K";

      const goldColor =
        firstVariant?.selectedOptions.find((opt) => opt.name === "Gold Color")
          ?.value || "";

      const diamondGrade =
        firstVariant?.selectedOptions.find(
          (opt) => opt.name === "Diamond Grade"
        )?.value || "";

      const diamondDetails = extractDiamondDetails(product.description);

      const sheetPricing = await getSheetPricing();
      const handle = product.handle;
      const productPricing = sheetPricing[handle] || {};
      const variantPrice = parseFloat(firstVariant?.price.amount || 0);

      return {
        productCode: firstVariant?.sku || "",
        handle: product.handle,
        name: product.title,
        gold: `${goldKarat} ${goldColor}`.trim(),
        goldPrice: firstVariant?.price.amount || "0",
        diamondDetails: {
          carat: diamondDetails.carat,
          quality: diamondGrade || diamondDetails.quality,
          shape: diamondDetails.shape,
          count: diamondDetails.count,
        },
        price: productPricing.price10K || variantPrice,
        prices: {
          "10K": productPricing.price10K || variantPrice,
          "14K": productPricing.price14K || variantPrice,
          "18K": productPricing.price18K || variantPrice,
        },
        currency: firstVariant?.price.currencyCode || "INR",
        image: product.featuredImage?.url || firstVariant?.image?.url || "",
        images:
          product.images?.edges?.map((img) => ({
            url: img.node.url,
            altText: img.node.altText,
          })) || [],
        allVariants: product.variants.edges.map((v) => v.node),
      };
    })
  );

  return transformedProducts.sort((a, b) => {
    const titleA = a.name.toLowerCase();
    const titleB = b.name.toLowerCase();

    const aHasBands = titleA.includes("band");
    const bHasBands = titleB.includes("band");
    const aHasSolitaires = titleA.includes("solitaire");
    const bHasSolitaires = titleB.includes("solitaire");

    if (aHasBands && !bHasBands) return -1;
    if (!aHasBands && bHasBands) return 1;
    if (aHasSolitaires && !bHasSolitaires) return -1;
    if (!aHasSolitaires && bHasSolitaires) return 1;

    return 0;
  });
}

export default async function RingsPage() {
  try {
    const response = await getRingsCollection();

    if (!response?.collection?.products?.edges) {
      return (
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-10 text-center text-red-600">
          <p>No rings found.</p>
        </div>
      );
    }

    const rings = await transformRingsData(
      response.collection.products.edges
    );

    return (
      <div className="container mx-auto px-3 md:px-6 lg:px-8 py-10 md:py-25">
        <CollectionSection id="rings-collection" title="Rings" items={rings} />
      </div>
    );
  } catch (error) {
    console.error("Error fetching rings:", error);
    return (
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-10 text-center text-red-600">
        <p>Error loading Rings: {error.message}</p>
      </div>
    );
  }
}
