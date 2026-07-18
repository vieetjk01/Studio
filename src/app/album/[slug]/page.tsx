import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllPhotos } from "@/lib/photos";
import { getStudioBrand } from "@/lib/studio-brand";
import Brand from "@/components/Brand";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import GalleryView from "./GalleryView";
import { buildAlbumMetadata } from "@/lib/album-meta";
import { MAIN_HOST } from "@/lib/hosts";
import { effectivePlan, type Plan } from "@/lib/plans";
import type { Feedback } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { data } = await createAdminClient()
    .from("albums")
    .select("title, description, cover_url, owner_id")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!data?.title) return { title: "mstudo" };
  return buildAlbumMetadata({
    title: data.title,
    description: data.description,
    coverUrl: data.cover_url,
    host: MAIN_HOST,
    path: `/album/${params.slug}`,
    ownerId: data.owner_id,
  });
}

export default async function GalleryPage({ params, searchParams }: { params: { slug: string }; searchParams?: { share?: string; s?: string } }) {
  const admin = createAdminClient();
  let shareIds: string[] | null = searchParams?.share ? searchParams.share.split(",").filter(Boolean) : null;
  if (!shareIds && searchParams?.s) {
    const { data: sh } = await admin
      .from("album_shares")
      .select("photo_ids")
      .eq("token", searchParams.s)
      .maybeSingle();
    if (sh?.photo_ids?.length) shareIds = sh.photo_ids as string[];
  }
  const { data: album } = await admin
    .from("albums")
    .select("id, slug, title, status, is_gallery, phase, password_hash, gallery_pinned, event_date, cover_url, category, category_label, client_name, download_enabled, watermark_delivery, watermark_text, owner_id")
    .eq("slug", params.slug)
    .single();

  // Accept both legacy galleries (is_gallery) and unified projects switched to
  // the delivery phase.
  const isDelivery = album?.is_gallery || album?.phase === "delivery";
  if (!album || !isDelivery || album.status !== "published") {
    return (
      <main className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 md:px-10">
          <Brand />
          <LanguageSwitcher />
        </header>
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <p style={{ color: "var(--text2)" }}>Album không khả dụng.</p>
        </div>
      </main>
    );
  }

  const hasPassword = !album.gallery_pinned && !!album.password_hash;

  // Chạy song song: brand, ảnh, sources, feedback và gói của chủ studio — gộp
  // Promise.all thay vì nhiều round-trip tuần tự (giảm TTFB trang khách).
  const [brand, allPhotos, { data: s }, { data: feedback }, { data: owner }] = await Promise.all([
    getStudioBrand(admin, album.owner_id),
    hasPassword
      ? Promise.resolve(null)
      : fetchAllPhotos(admin, album.id, "id, drive_file_id, name, source_id, position, is_video"),
    // drive_url/kind cần cho cả 2 trường hợp: có mật khẩu vẫn cần để tính link
    // Drive (nhưng chỉ gửi cho client SAU khi mở khoá — xem access route).
    admin.from("album_sources").select("id, name, position, stage, drive_url, kind").eq("album_id", album.id).order("position"),
    admin
      .from("feedback")
      .select("*")
      .eq("album_id", album.id)
      .eq("approved", true)
      .order("created_at", { ascending: false }),
    admin.from("profiles").select("plan, plan_expires_at, role").eq("id", album.owner_id).maybeSingle(),
  ]);
  const studioName = brand.name;

  // Chỉ gói Studio & Photographer Plus (và admin) được tải ZIP nén từ link album.
  const ownerPlan = effectivePlan(owner?.plan as Plan, owner?.plan_expires_at);
  const canZip = owner?.role === "admin" || ownerPlan === "studio" || ownerPlan === "photographer_plus";

  // Sources hiển thị (ưu tiên stage 'delivery', fallback tất cả nếu chưa gắn).
  const delSources = (s ?? []).filter((x) => x.stage === "delivery");
  const useStages = delSources.length > 0;
  const shownSources = useStages ? delSources : (s ?? []);
  const delSourceIds = new Set(delSources.map((x) => x.id));

  let photos = null;
  let sources = null;
  // Link Drive của các folder trong album — dùng cho nút "Tải album". Với album
  // có mật khẩu, KHÔNG lộ trước khi mở khoá; access route trả về sau khi đúng mk.
  let driveFolders: { name: string; url: string }[] = [];
  if (!hasPassword) {
    photos = (allPhotos ?? []).filter((ph) => !useStages || !ph.source_id || delSourceIds.has(ph.source_id));
    sources = shownSources.map(({ id, name, position }) => ({ id, name, position }));
    driveFolders = shownSources
      .filter((x) => x.kind === "folder" && x.drive_url)
      .map(({ name, drive_url }) => ({ name, url: drive_url as string }));
  }

  return (
    <GalleryView
      gallery={{
        id: album.id,
        slug: album.slug,
        title: album.title,
        event_date: album.event_date,
        cover_url: album.cover_url,
        hasPassword,
        allowDownload: album.download_enabled !== false,
        canZip,
        watermark: album.watermark_delivery ? (album.watermark_text || studioName) : null,
      }}
      initialPhotos={photos}
      initialSources={sources}
      initialDriveFolders={driveFolders}
      feedback={(feedback ?? []) as Feedback[]}
      shareIds={shareIds}
      studioName={studioName}
      logoUrl={brand.logoUrl}
    />
  );
}
