/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Read ALL photos of an album, paginating past Supabase's default 1000-row cap.
 * Works with any Supabase client (server / admin / browser).
 */
export async function fetchAllPhotos(
  client: any,
  albumId: string,
  columns = "*"
): Promise<any[]> {
  const out: any[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await client
      .from("photos")
      .select(columns)
      .eq("album_id", albumId)
      .order("position")
      .range(from, from + size - 1);
    if (error || !data || data.length === 0) break;
    out.push(...data);
    if (data.length < size) break;
  }
  return out;
}

/** Split an array into chunks of `size`. */
export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
