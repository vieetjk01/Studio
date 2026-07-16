import "server-only";
import { google } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";
import { signOAuthState, verifyOAuthState } from "@/lib/oauth-state";
import { contractBaseName } from "@/lib/desktop/contract-doc";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Kết nối Google Drive RIÊNG cho từng studio (per-owner OAuth, scope drive.file).
 * Dùng cho tính năng đồng bộ ảnh/video hợp đồng của MStudo Desktop:
 *  - Tạo cây thư mục trên Drive studio: MStudo/{Hợp đồng…}/Photo/{JPG Goc,Raw,
 *    File ChinhSua} + Video/{Video Goc,Video HoanThien} (nếu có quay).
 *  - Đặt "JPG Goc" & "File ChinhSua" ở chế độ ai-có-link-xem-được để album/gallery
 *    (đọc qua GOOGLE_API_KEY) hoạt động, rồi tự tạo album chọn ảnh + gallery giao khách.
 *  - Cấp access token tạm cho client tải file THẲNG lên Drive (không qua máy chủ).
 * Tái dùng OAuth Web client của Story/Admin (drive.file → không cần Google review).
 */

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
// Redirect riêng cho luồng kết nối Drive của studio (đăng ký trong Google Cloud).
const REDIRECT = process.env.GOOGLE_STUDIO_DRIVE_REDIRECT_URI || "";
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const ROOT_FOLDER_NAME = "MStudo";

export function studioDriveConfigured(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET && REDIRECT);
}

function oauth() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT);
}

// ─── Mẫu thư mục ──────────────────────────────────────────────────────────────

export type FolderRole = "selection" | "delivery" | null;
export type FolderNode = { name: string; role?: FolderRole; excluded?: boolean };
export type FolderTemplate = { photo: FolderNode[]; video: FolderNode[]; product: FolderNode[] };
/** 1 nút lá trong cây đã tạo (trả cho client để tạo thư mục local + biết đích upload). */
export type DriveTreeNode = { path: string; id: string; role: FolderRole; excluded: boolean };

// Mặc định: JPG Goc → album chọn; File ChinhSua → giao khách; Raw & Video Goc loại trừ.
export const DEFAULT_FOLDER_TEMPLATE: FolderTemplate = {
  photo: [
    { name: "JPG Goc", role: "selection", excluded: false },
    { name: "Raw", role: null, excluded: true },
    { name: "File ChinhSua", role: "delivery", excluded: false },
  ],
  video: [
    { name: "Video Goc", role: null, excluded: true },
    { name: "Video HoanThien", role: null, excluded: false },
  ],
  product: [{ name: "SanPham", role: null, excluded: false }],
};

function cleanNodes(arr: any): FolderNode[] | null {
  if (!Array.isArray(arr)) return null;
  const out: FolderNode[] = [];
  for (const n of arr) {
    const name = typeof n?.name === "string" ? n.name.trim() : "";
    if (!name) continue;
    const role: FolderRole = n?.role === "selection" || n?.role === "delivery" ? n.role : null;
    out.push({ name, role, excluded: !!n?.excluded });
  }
  return out.length ? out : null;
}

/** Chuẩn hóa mẫu người dùng lưu → luôn có photo[]/video[]/product[] hợp lệ. */
export function normalizeTemplate(t: any): FolderTemplate {
  return {
    photo: cleanNodes(t?.photo) ?? DEFAULT_FOLDER_TEMPLATE.photo,
    video: cleanNodes(t?.video) ?? DEFAULT_FOLDER_TEMPLATE.video,
    product: cleanNodes(t?.product) ?? DEFAULT_FOLDER_TEMPLATE.product,
  };
}

// ─── Kết nối / trạng thái ─────────────────────────────────────────────────────

type DriveRow = {
  refresh_token: string | null;
  root_folder_id: string | null;
  root_folder_name: string | null;
  folder_template: any;
};

async function loadStudioDrive(ownerId: string): Promise<DriveRow | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("studio_drive")
    .select("refresh_token, root_folder_id, root_folder_name, folder_template")
    .eq("owner_id", ownerId)
    .maybeSingle();
  return (data as DriveRow) ?? null;
}

/** URL đưa chủ studio sang Google cấp quyền Drive (state ký HMAC = ownerId). */
export function studioDriveAuthUrl(ownerId: string): string {
  return oauth().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [SCOPE],
    state: signOAuthState(`studio:${ownerId}`),
  });
}

/** Lấy ownerId từ state đã ký ở callback (chống account-linking CSRF). */
export function ownerFromState(state: string | null | undefined): string | null {
  const payload = verifyOAuthState(state);
  if (!payload || !payload.startsWith("studio:")) return null;
  return payload.slice("studio:".length) || null;
}

/** Đổi code lấy refresh token và lưu (upsert — giữ nguyên root/template cũ). */
export async function connectStudioDrive(ownerId: string, code: string): Promise<void> {
  const o = oauth();
  const { tokens } = await o.getToken(code);
  if (!tokens.refresh_token) throw new Error("no_refresh_token");
  const db = createAdminClient();
  await db.from("studio_drive").upsert(
    {
      owner_id: ownerId,
      refresh_token: tokens.refresh_token,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_id" }
  );
}

/** Ngắt kết nối: xóa token + root (kết nối lại tài khoản khác sẽ tạo root mới). */
export async function disconnectStudioDrive(ownerId: string): Promise<void> {
  const db = createAdminClient();
  await db
    .from("studio_drive")
    .update({ refresh_token: null, root_folder_id: null, updated_at: new Date().toISOString() })
    .eq("owner_id", ownerId);
}

export async function studioDriveStatus(
  ownerId: string
): Promise<{ configured: boolean; connected: boolean; rootFolderName: string; rootCreated: boolean; template: FolderTemplate }> {
  const row = await loadStudioDrive(ownerId);
  return {
    configured: studioDriveConfigured(),
    connected: !!row?.refresh_token,
    rootFolderName: row?.root_folder_name || ROOT_FOLDER_NAME,
    rootCreated: !!row?.root_folder_id,
    template: normalizeTemplate(row?.folder_template),
  };
}

/**
 * Đặt/đổi tên thư mục gốc trên Drive. Nếu thư mục gốc đã được tạo và đang kết
 * nối → đổi tên luôn trên Drive (studio vẫn có thể tự kéo nó đi nơi khác trong
 * Drive, app nhận theo ID nên không ảnh hưởng đồng bộ).
 */
export async function setRootFolderName(ownerId: string, name: string): Promise<void> {
  const clean = (name || "").trim().replace(/[\\/]/g, " ").slice(0, 100) || ROOT_FOLDER_NAME;
  const db = createAdminClient();
  await db.from("studio_drive").upsert(
    { owner_id: ownerId, root_folder_name: clean, updated_at: new Date().toISOString() },
    { onConflict: "owner_id" }
  );
  const row = await loadStudioDrive(ownerId);
  if (row?.refresh_token && row.root_folder_id) {
    const o = oauth();
    o.setCredentials({ refresh_token: row.refresh_token });
    const drive = google.drive({ version: "v3", auth: o });
    await drive.files.update({ fileId: row.root_folder_id, requestBody: { name: clean } }).catch(() => {});
  }
}

/** Lưu mẫu thư mục mặc định của studio (áp dụng cho hợp đồng tạo cây SAU đó). */
export async function setFolderTemplate(ownerId: string, template: FolderTemplate): Promise<void> {
  const db = createAdminClient();
  await db.from("studio_drive").upsert(
    { owner_id: ownerId, folder_template: normalizeTemplate(template), updated_at: new Date().toISOString() },
    { onConflict: "owner_id" }
  );
}

/** Cấp access token TẠM để client tải file thẳng lên Drive (scope drive.file). */
export async function getStudioAccessToken(
  ownerId: string
): Promise<{ access_token: string; expiry: number } | null> {
  const row = await loadStudioDrive(ownerId);
  if (!row?.refresh_token) return null;
  const o = oauth();
  o.setCredentials({ refresh_token: row.refresh_token });
  const r = await o.getAccessToken();
  const token = r?.token;
  if (!token) return null;
  return { access_token: token, expiry: o.credentials.expiry_date ?? Date.now() + 50 * 60 * 1000 };
}

// ─── Tạo cây thư mục Drive cho hợp đồng ───────────────────────────────────────

async function mkFolder(drive: any, name: string, parentId: string | null): Promise<string> {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentId ? { parents: [parentId] } : {}),
    },
    fields: "id",
  });
  const id = res.data.id as string | undefined;
  if (!id) throw new Error("mkfolder_failed");
  return id;
}

async function makePublic(drive: any, fileId: string): Promise<void> {
  await drive.permissions.create({ fileId, requestBody: { role: "reader", type: "anyone" } }).catch(() => {});
}

export type ContractForDrive = {
  id: string;
  code?: string | null;
  title?: string | null;
  client_name?: string | null;
  client_phone?: string | null;
  event_date?: string | null;
  shoot_type?: string | null;
  drive_folder_id?: string | null;
  drive_tree?: any;
  drive_make_photo?: boolean | null;
  drive_make_video?: boolean | null;
  drive_make_product?: boolean | null;
  selection_album_id?: string | null;
  gallery_album_id?: string | null;
};

/**
 * Bảo đảm cây thư mục Drive cho hợp đồng đã tồn tại (idempotent — nếu đã tạo thì
 * trả lại sơ đồ cũ). Trả { folderId, tree } hoặc { error }.
 */
export async function ensureContractDriveTree(
  ownerId: string,
  contract: ContractForDrive
): Promise<{ folderId: string; tree: DriveTreeNode[] } | { error: string }> {
  const row = await loadStudioDrive(ownerId);
  if (!row?.refresh_token) return { error: "not_connected" };

  // Đã tạo rồi → trả lại (không tạo trùng).
  if (contract.drive_folder_id && Array.isArray(contract.drive_tree)) {
    return { folderId: contract.drive_folder_id, tree: contract.drive_tree as DriveTreeNode[] };
  }

  const o = oauth();
  o.setCredentials({ refresh_token: row.refresh_token });
  const drive = google.drive({ version: "v3", auth: o });
  const db = createAdminClient();

  // 1) Thư mục gốc (tên do studio đặt) — studio có thể tự kéo đi nơi khác trong
  //    Drive sau khi tạo, app vẫn nhận đúng vì lưu theo ID.
  let rootId = row.root_folder_id;
  if (!rootId) {
    rootId = await mkFolder(drive, row.root_folder_name || ROOT_FOLDER_NAME, null);
    await db
      .from("studio_drive")
      .update({ root_folder_id: rootId, updated_at: new Date().toISOString() })
      .eq("owner_id", ownerId);
  }

  // 2) Thư mục hợp đồng.
  const contractFolderName = contractBaseName(contract as any);
  const contractFolderId = await mkFolder(drive, contractFolderName, rootId);

  const template = normalizeTemplate(row.folder_template);
  const tree: DriveTreeNode[] = [];

  // Studio chọn khi tạo hợp đồng: mặc định tạo Photo + SanPham, Video chọn riêng.
  const makePhoto = contract.drive_make_photo !== false;
  const makeVideo = contract.drive_make_video === true;
  const makeProduct = contract.drive_make_product !== false;

  // 3) Photo/*
  if (makePhoto) {
    const photoId = await mkFolder(drive, "Photo", contractFolderId);
    for (const node of template.photo) {
      const id = await mkFolder(drive, node.name, photoId);
      if (node.role === "selection" || node.role === "delivery") await makePublic(drive, id);
      tree.push({ path: `Photo/${node.name}`, id, role: node.role ?? null, excluded: !!node.excluded });
    }
  }

  // 4) Video/* — chỉ khi studio chọn có quay.
  if (makeVideo) {
    const videoId = await mkFolder(drive, "Video", contractFolderId);
    for (const node of template.video) {
      const id = await mkFolder(drive, node.name, videoId);
      if (node.role === "selection" || node.role === "delivery") await makePublic(drive, id);
      tree.push({ path: `Video/${node.name}`, id, role: node.role ?? null, excluded: !!node.excluded });
    }
  }

  // 5) SanPham/ — thư mục sản phẩm (top-level trong thư mục hợp đồng).
  if (makeProduct) {
    for (const node of template.product) {
      const id = await mkFolder(drive, node.name, contractFolderId);
      if (node.role === "selection" || node.role === "delivery") await makePublic(drive, id);
      tree.push({ path: node.name, id, role: node.role ?? null, excluded: !!node.excluded });
    }
  }

  await db
    .from("studio_contracts")
    .update({ drive_folder_id: contractFolderId, drive_tree: tree })
    .eq("id", contract.id);

  return { folderId: contractFolderId, tree };
}

// ─── Tạo album chọn ảnh (JPG Goc) + gallery giao khách (File ChinhSua) ────────

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "album"
  );
}

async function uniqueSlug(db: any, title: string): Promise<string> {
  const base = slugify(title);
  for (let i = 0; i < 5; i++) {
    const slug = `${base}-${Math.random().toString(36).slice(2, 8)}`;
    const { data } = await db.from("albums").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function createAlbumFromFolder(
  db: any,
  ownerId: string,
  opts: {
    title: string;
    folderId: string;
    phase: "selection" | "delivery";
    isGallery: boolean;
    sourceName: string;
    clientName?: string | null;
    clientPhone?: string | null;
    eventDate?: string | null;
  }
): Promise<string | null> {
  const slug = await uniqueSlug(db, opts.title);
  const { data: album, error } = await db
    .from("albums")
    .insert({
      owner_id: ownerId,
      title: opts.title,
      slug,
      phase: opts.phase,
      is_gallery: opts.isGallery,
      status: "published",
      client_name: opts.clientName ?? null,
      client_phone: opts.clientPhone ?? null,
      event_date: opts.eventDate ?? null,
      download_enabled: opts.phase === "delivery",
      watermark_enabled: opts.phase === "selection",
    })
    .select("id")
    .single();
  if (error || !album) return null;
  await db.from("album_sources").insert({
    album_id: album.id,
    name: opts.sourceName,
    drive_url: `https://drive.google.com/drive/folders/${opts.folderId}`,
    kind: "folder",
    stage: opts.phase,
    position: 0,
  });
  return album.id as string;
}

/**
 * Tạo (nếu chưa có) album chọn ảnh từ thư mục "JPG Goc" và gallery giao khách từ
 * "File ChinhSua", rồi gắn vào hợp đồng. Trả về id các album.
 */
export async function wireContractAlbums(
  ownerId: string,
  contract: ContractForDrive,
  tree: DriveTreeNode[]
): Promise<{ selectionAlbumId: string | null; galleryAlbumId: string | null }> {
  const db = createAdminClient();
  const sel = tree.find((n) => n.role === "selection");
  const del = tree.find((n) => n.role === "delivery");
  const who = contract.client_name || contract.code || "Hợp đồng";

  let selectionAlbumId = contract.selection_album_id ?? null;
  let galleryAlbumId = contract.gallery_album_id ?? null;
  const patch: Record<string, any> = {};

  if (sel && !selectionAlbumId) {
    selectionAlbumId = await createAlbumFromFolder(db, ownerId, {
      title: `Chọn ảnh · ${who}`,
      folderId: sel.id,
      phase: "selection",
      isGallery: false,
      sourceName: sel.path.split("/").pop() || "JPG Goc",
      clientName: contract.client_name,
      clientPhone: contract.client_phone,
      eventDate: contract.event_date,
    });
    if (selectionAlbumId) patch.selection_album_id = selectionAlbumId;
  }

  if (del && !galleryAlbumId) {
    galleryAlbumId = await createAlbumFromFolder(db, ownerId, {
      title: `Giao khách · ${who}`,
      folderId: del.id,
      phase: "delivery",
      isGallery: true,
      sourceName: del.path.split("/").pop() || "File ChinhSua",
      clientName: contract.client_name,
      clientPhone: contract.client_phone,
      eventDate: contract.event_date,
    });
    if (galleryAlbumId) patch.gallery_album_id = galleryAlbumId;
  }

  if (Object.keys(patch).length) await db.from("studio_contracts").update(patch).eq("id", contract.id);
  return { selectionAlbumId, galleryAlbumId };
}
