import {
  fetchCollectionByHandle,
  transformCollectionData,
} from "./supabase-helpers.js";

export async function getBraceletsCollection() {
  const collection = await fetchCollectionByHandle("bracelets");
  if (!collection) return { collection: null };
  return transformCollectionData(collection);
}
