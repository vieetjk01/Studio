import "server-only";
import crypto from "crypto";
import { mainUrl } from "@/lib/hosts";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** URL công khai của form điền thông tin (không cần mật khẩu). */
export function intakeUrl(token: string): string {
  return mainUrl(`/form/${token}`);
}

/** Bảo đảm hợp đồng có intake_token (tạo & lưu nếu chưa có). Trả về token. */
export async function ensureIntakeToken(db: any, contractId: string, existing?: string | null): Promise<string> {
  if (existing) return existing;
  const token = crypto.randomBytes(16).toString("hex");
  await db.from("studio_contracts").update({ intake_token: token }).eq("id", contractId);
  return token;
}
