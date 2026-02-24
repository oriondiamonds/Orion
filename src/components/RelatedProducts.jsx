"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function RelatedProducts({ productId }) {
  const [related, setRelated] = useState([]);
  const router = useRouter();

  useEffect(() => {
    if (!productId) return;
    fetchRelated();
  }, [productId]);

  async function fetchRelated() {
    // Find the collection this product belongs to
    const { data: cp } = await supabase
      .from("collection_products")
      .select("collection_id")
      .eq("product_id", productId)
      .limit(1)
      .single();

    if (!cp?.collection_id) return;

    // Fetch sibling products in the same collection
    const { data: siblings } = await supabase
      .from("collection_products")
      .select(
        `position, product:products(
          id, handle, title, featured_image_url,
          images:product_images(url, position)
        )`
      )
      .eq("collection_id", cp.collection_id)
      .neq("product_id", productId)
      .order("position")
      .limit(6);

    if (!siblings?.length) return;

    setRelated(
      siblings.map(({ product: p }) => ({
        id: p.id,
        handle: p.handle,
        title: p.title,
        image:
          (p.images || []).sort((a, b) => a.position - b.position)[0]?.url ||
          p.featured_image_url,
      }))
    );
  }

  if (!related.length) return null;

  return (
    <section className="mt-16 mb-8">
      <h2 className="text-2xl font-bold text-[#0a1833] mb-6">
        You may also like
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {related.map((item) => (
          <div
            key={item.id}
            onClick={() => router.push(`/product/${item.handle}`)}
            className="cursor-pointer group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="relative aspect-square bg-gray-50 overflow-hidden">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gray-200" />
              )}
            </div>
            <div className="p-3">
              <p className="text-xs md:text-sm font-medium text-[#0a1833] line-clamp-2 capitalize leading-snug">
                {item.title}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
