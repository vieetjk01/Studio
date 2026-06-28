import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import GalleryCards from "./GalleryCards";


export default async function GalleriesPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role, can_galleries")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  const permitted = me?.role === "admin" || me?.can_galleries;
  if (!permitted) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Chưa được cấp quyền</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
            Tài khoản của bạn chưa được phép tạo gallery giao khách. Vui lòng liên hệ quản trị viên để được cấp quyền.
          </p>
        </div>
      </div>
    );
  }

  const { data: galleries } = await supabase
    .from("albums")
    .select("id, slug, title, cover_url, status, gallery_pinned, download_enabled, category, category_label, client_name, event_date, photos(drive_file_id)")
    .eq("is_gallery", true)
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const list = galleries ?? [];

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="eyebrow mb-1.5">Giao khách</p>
          <h1 className="font-serif text-3xl font-medium">Gallery khách</h1>
        </div>
        <Link href="/dashboard/galleries/new" className="btn-primary">
          <Plus size={16} /> Tạo gallery
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <p style={{ color: "var(--text2)" }}>Chưa có gallery nào.</p>
          <Link href="/dashboard/galleries/new" className="btn-ghost mt-4">
            <Plus size={16} /> Tạo gallery
          </Link>
        </div>
      ) : (
        <GalleryCards galleries={list as never} />
      )}
    </div>
  );
}
