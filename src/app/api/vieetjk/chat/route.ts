import { NextRequest } from "next/server";
import { buildSystemPrompt, CHAT_MODEL, MAX_TURNS, type ChatTurn } from "@/lib/vieetjk/assistant";
import type { Lang } from "@/lib/vieetjk/content";

/**
 * Trợ lý tư vấn tự động cho website vieetjk.com — dùng Google Gemini.
 * Nhận lịch sử hội thoại + ngôn ngữ, gọi Gemini (streaming SSE) và trả về text
 * chạy dần cho widget.
 *
 * Cần biến môi trường GEMINI_API_KEY (tạo ở aistudio.google.com, đặt trên Vercel).
 * Thiếu key → 503. Model đặt qua GEMINI_MODEL (mặc định gemini-2.5-flash).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

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

/** Rút mọi đoạn text trong một chunk JSON của Gemini. */
function extractText(json: unknown): string {
  const parts = (json as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    ?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((p) => (typeof p?.text === "string" ? p.text : "")).join("");
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "assistant_unavailable" }, { status: 503 });
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

  // Gemini: assistant → "model"; system prompt tách riêng ở system_instruction.
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const upstream = await fetch(
    `${GEMINI_BASE}/${encodeURIComponent(CHAT_MODEL)}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: buildSystemPrompt(lang) }] },
        contents,
        generationConfig: { temperature: 0.6, maxOutputTokens: 1024 },
      }),
      cache: "no-store",
    }
  ).catch(() => null);

  const errorMsg =
    lang === "en"
      ? "\n\nSorry, something went wrong. Please try again or contact us directly."
      : "\n\nXin lỗi, có lỗi xảy ra. Bạn thử lại hoặc liên hệ trực tiếp giúp mình nhé.";

  const encoder = new TextEncoder();

  if (!upstream || !upstream.ok || !upstream.body) {
    return new Response(errorMsg.trim(), {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buf = "";
      let emitted = false;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          // SSE: mỗi sự kiện là các dòng "data: {...}" ngăn cách bằng dòng trống.
          let nl: number;
          while ((nl = buf.indexOf("\n")) !== -1) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const text = extractText(JSON.parse(payload));
              if (text) {
                emitted = true;
                controller.enqueue(encoder.encode(text));
              }
            } catch {
              /* chunk chưa trọn — bỏ qua */
            }
          }
        }
        if (!emitted) controller.enqueue(encoder.encode(errorMsg.trim()));
      } catch {
        controller.enqueue(encoder.encode(errorMsg));
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
