import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, CHAT_MODEL, MAX_TURNS, type ChatTurn } from "@/lib/vieetjk/assistant";
import type { Lang } from "@/lib/vieetjk/content";

/**
 * Trợ lý tư vấn tự động cho website vieetjk.com.
 * Nhận lịch sử hội thoại + ngôn ngữ, gọi Claude (streaming) và trả về text chạy dần.
 *
 * Cần biến môi trường ANTHROPIC_API_KEY (đặt ở Vercel). Không có key → 503.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function sanitize(turns: unknown): ChatTurn[] {
  if (!Array.isArray(turns)) return [];
  const out: ChatTurn[] = [];
  for (const t of turns) {
    const role = t?.role;
    const content = typeof t?.content === "string" ? t.content.trim() : "";
    if ((role === "user" || role === "assistant") && content) {
      out.push({ role, content: content.slice(0, 4000) });
    }
  }
  // Giữ tối đa MAX_TURNS lượt gần nhất; hội thoại phải bắt đầu bằng lượt của khách.
  const trimmed = out.slice(-MAX_TURNS);
  while (trimmed.length && trimmed[0].role !== "user") trimmed.shift();
  return trimmed;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "assistant_unavailable" },
      { status: 503 }
    );
  }

  let body: { messages?: unknown; lang?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const lang: Lang = body.lang === "en" ? "en" : "vi";
  const messages = sanitize(body.messages);
  if (messages.length === 0) {
    return Response.json({ error: "empty" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const anthropicStream = client.messages.stream({
          model: CHAT_MODEL,
          max_tokens: 1024,
          // Q&A tư vấn ngắn gọn — ưu tiên tốc độ, không cần suy luận sâu.
          output_config: { effort: "low" },
          system: [
            {
              type: "text",
              text: buildSystemPrompt(lang),
              // Ngữ cảnh ổn định giữa các lượt → cache để tiết kiệm token.
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });

        anthropicStream.on("text", (delta) => {
          controller.enqueue(encoder.encode(delta));
        });
        await anthropicStream.finalMessage();
      } catch {
        controller.enqueue(
          encoder.encode(
            lang === "en"
              ? "\n\nSorry, something went wrong. Please try again or contact us directly."
              : "\n\nXin lỗi, có lỗi xảy ra. Bạn thử lại hoặc liên hệ trực tiếp giúp mình nhé."
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
