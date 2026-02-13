import {
  fetchCollectionByHandle,
  transformCollectionData,
} from "./supabase-helpers.js";

export async function getEarringsCollection() {
  const collection = await fetchCollectionByHandle("earrings");
  if (!collection) return { collection: null };
  return transformCollectionData(collection);
}
