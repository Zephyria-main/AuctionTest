/** Public URL for an object in the item-images bucket. */
export function itemImageUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return `${base}/storage/v1/object/public/item-images/${storagePath}`
}
