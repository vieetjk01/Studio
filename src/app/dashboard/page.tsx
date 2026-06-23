import { createClient } from "@/lib/supabase/server";
import AlbumList from "./AlbumList";


export default async function DashboardPage() {
  const supabase = createClient();

  const { data: albums } = await supabase
    .from("albums")
    .select("*, photos(drive_file_id), selections(count)")
    .eq("is_gallery", false)
    .order("updated_at", { ascending: false });

  return <AlbumList albums={albums ?? []} />;
}
