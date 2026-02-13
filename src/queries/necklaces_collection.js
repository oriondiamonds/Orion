import {
  fetchCollectionByHandle,
  transformCollectionData,
} from "./supabase-helpers.js";

export async function getNecklacesCollection() {
  const collection = await fetchCollectionByHandle("necklaces");
  if (!collection) return { collection: null };
  return transformCollectionData(collection);
}
