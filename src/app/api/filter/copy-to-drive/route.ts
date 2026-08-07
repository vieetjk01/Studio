import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { copyFilesToStudioDrive } from "@/lib/studio-drive";
import { extractFolderId } from "@/lib/drive";

export const dynamic = "force-dynamic";

/**
 * Copy các ảnh đã lọc sang một thư mục trên Drive của studio — CHÉP THẲNG trên
 * Drive (không tải về máy). Yêu cầu đăng nhập (chủ studio) + đã kết nối Drive.
 *
 * Body:
 *  - files: [{ id, name }]  các file Drive cần chép.
 *  - targetFolderUrl?       link thư mục đích có sẵn (studio tự chọn).
 *  - sourceFolderUrl?       link thư mục gốc → tạo thư mục con "ảnh chọn" bên trong.
 *  - newFolderName?         tên thư mục con khi tạo mới (mặc định "Anh khach chon").
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    files?: { id: string; name: string }[];
    targetFolderUrl?: string;
    sourceFolderUrl?: string;
    newFolderName?: string;
  };

  const files = (Array.isArray(body.files) ? body.files : [])
    .filter((f) => f && typeof f.id === "string" && typeof f.name === "string")
    .slice(0, 3000);
  if (!files.length) return NextResponse.json({ error: "Không có ảnh để copy." }, { status: 400 });

  const targetFolderId = body.targetFolderUrl ? extractFolderId(body.targetFolderUrl) : null;
  const parentId = body.sourceFolderUrl ? extractFolderId(body.sourceFolderUrl) : null;

  const res = await copyFilesToStudioDrive(user.id, {
    files,
    targetFolderId,
    newFolder: targetFolderId ? null : { name: body.newFolderName?.trim() || "Anh khach chon", parentId },
  });

  if (!res.ok) {
    const map: Record<string, string> = {
      not_connected: "Studio chưa kết nối Google Drive. Vào mục Kết nối để nối Drive trước khi copy.",
      no_files: "Không có ảnh để copy.",
      no_target: "Chưa xác định được thư mục đích (thiếu link gốc để tạo thư mục con, hoặc chưa dán link đích).",
      target_not_folder: "Link đích không phải là thư mục Drive.",
      target_unreachable:
        "Không mở được thư mục đích. Drive chỉ cho phép thao tác trên thư mục do ứng dụng tạo (ví dụ album hợp đồng đồng bộ qua MStudo Desktop).",
      create_folder_failed:
        "Không tạo được thư mục trên Drive. Drive chỉ cho phép tạo/chép trong thư mục do ứng dụng tạo (ví dụ album hợp đồng đồng bộ qua MStudo Desktop).",
    };
    return NextResponse.json({ error: map[res.error] ?? res.error }, { status: 200 });
  }

  return NextResponse.json(res);
}
