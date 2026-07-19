import { NextResponse } from "next/server";
import { requireStudio } from "@/lib/auth-guards";
import {
  studioDriveStatus,
  disconnectStudioDrive,
  setFolderTemplate,
  setRootFolderName,
  listDriveRoots,
  listServicesWithRoot,
  addDriveRoot,
  renameDriveRoot,
  deleteDriveRoot,
  setServiceRoot,
} from "@/lib/studio-drive";

export const dynamic = "force-dynamic";

async function owner() {
  const p = await requireStudio("full");
  if (!p || p.isStaff || (p.actingRole !== "owner" && p.actingRole !== "admin")) return null;
  return p;
}

/** Trạng thái + thư mục gốc mặc định + danh sách thư mục gốc theo dịch vụ. */
async function fullStatus(ownerId: string) {
  const [status, roots, services] = await Promise.all([
    studioDriveStatus(ownerId),
    listDriveRoots(ownerId),
    listServicesWithRoot(ownerId),
  ]);
  return { ...status, roots, services };
}

/** Trạng thái kết nối Drive + mẫu thư mục + thư mục gốc theo dịch vụ. */
export async function GET() {
  const p = await owner();
  if (!p) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(await fullStatus(p.id));
}

/**
 * Lưu cấu hình Drive. Body:
 *  - { rootFolderName?, template? }         → thư mục gốc mặc định + mẫu thư mục.
 *  - { action: "addRoot", name }            → thêm thư mục gốc theo dịch vụ.
 *  - { action: "renameRoot", id, name }     → đổi tên thư mục gốc.
 *  - { action: "deleteRoot", id }           → xoá thư mục gốc.
 *  - { action: "mapService", serviceId, rootId } → gán loại dịch vụ vào thư mục gốc.
 */
export async function PUT(req: Request) {
  const p = await owner();
  if (!p) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));

  switch (body?.action) {
    case "addRoot":
      if (typeof body.name === "string") await addDriveRoot(p.id, body.name);
      break;
    case "renameRoot":
      if (typeof body.id === "string" && typeof body.name === "string") await renameDriveRoot(p.id, body.id, body.name);
      break;
    case "deleteRoot":
      if (typeof body.id === "string") await deleteDriveRoot(p.id, body.id);
      break;
    case "mapService":
      if (typeof body.serviceId === "string")
        await setServiceRoot(p.id, body.serviceId, typeof body.rootId === "string" && body.rootId ? body.rootId : null);
      break;
    default:
      if (typeof body.rootFolderName === "string") await setRootFolderName(p.id, body.rootFolderName);
      if (body.template) await setFolderTemplate(p.id, body.template);
  }

  return NextResponse.json(await fullStatus(p.id));
}

/** Ngắt kết nối Drive của studio. */
export async function DELETE() {
  const p = await owner();
  if (!p) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await disconnectStudioDrive(p.id);
  return NextResponse.json({ ok: true });
}
