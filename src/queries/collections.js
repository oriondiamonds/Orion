import {
  fetchCollectionByHandle,
  transformCollectionData,
} from "./supabase-helpers.js";

export async function getRingsCollection() {
  const collection = await fetchCollectionByHandle("rings");
  if (!collection) return { collection: null };
  return transformCollectionData(collection);
}
