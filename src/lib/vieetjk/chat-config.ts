import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Cấu hình chatbox do chủ studio tự chỉnh trong dashboard. */
export interface ChatConfig {
  greeting: string | null;
  instructions: string | null;
}

/** Đọc cấu hình chatbox của một studio (service-role, bỏ qua RLS). */
export async function loadChatConfig(ownerId: string): Promise<ChatConfig> {
  const db = createAdminClient();
  const { data } = await db
    .from("website_chat_config")
    .select("greeting, instructions")
    .eq("owner_id", ownerId)
    .maybeSingle();
  return {
    greeting: (data?.greeting as string | undefined)?.trim() || null,
    instructions: (data?.instructions as string | undefined)?.trim() || null,
  };
}
