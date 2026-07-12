import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { connectAdminDrive } from "@/lib/mstudo-drive";

export const dynamic = "force-dynamic";

/** Google OAuth callback cho luồng kết nối Drive của admin. */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  const back = (q: string) => NextResponse.redirect(new URL(`/dashboard/admin/system?${q}`, req.url));
  if (!admin) return back("drive=forbidden");

  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  if (error || !code) return back("drive=error");
  try {
    await connectAdminDrive(code);
    return back("drive=connected");
  } catch {
    return back("drive=error");
  }
}
