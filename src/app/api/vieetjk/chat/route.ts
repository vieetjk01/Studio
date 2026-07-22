import { NextRequest } from "next/server";
import { buildSystemPrompt, MAX_TURNS, type ChatTurn } from "@/lib/vieetjk/assistant";
import { loadProviders, requestProvider, extractDelta, finishReason } from "@/lib/vieetjk/providers";
import type { Lang } from "@/lib/vieetjk/content";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Trợ lý tư vấn tự động cho website vieetjk.com — hỗ trợ NHIỀU API.
 * Cấu hình qua CHAT_PROVIDERS (JSON) hoặc GEMINI_API_KEY (xem lib/vieetjk/providers).
 * Bot thử lần lượt từng provider; cái nào lỗi/hết quota/không có text thì tự
 * chuyển sang cái kế tiếp. Trả về text chạy dần (streaming) cho widget.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function sanitize(turns: unknown): ChatTurn[] {
  if (!Array.isArray(turns)) return [];
  const out: ChatTurn[] = [];
  for (const t of turns) {
    const role = (t as any)?.role;
    const content = typeof (t as any)?.content === "string" ? (t as any).content.trim() : "";
    if ((role === "user" || role === "assistant") && content) {
      out.push({ role, content: content.slice(0, 4000) });
    }
  }
  const trimmed = out.slice(-MAX_TURNS);
  while (trimmed.length && trimmed[0].role !== "user") trimmed.shift();
  return trimmed;
}

export async function POST(req: NextRequest) {
  const providers = loadProviders();
  if (providers.length === 0) {
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

  const systemText = buildSystemPrompt(lang);
  const errorMsg =
    lang === "en"
      ? "\n\nSorry, something went wrong. Please try again or contact us directly."
      : "\n\nXin lỗi, có lỗi xảy ra. Bạn thử lại hoặc liên hệ trực tiếp giúp mình nhé.";

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let done = false;
      const debug: string[] = [];

      for (const p of providers) {
        // 1) Gửi yêu cầu tới provider hiện tại.
        let upstream: Response | null = null;
        try {
          upstream = await requestProvider(p, systemText, messages);
        } catch (e) {
          debug.push(`${p.label}: net ${(e as Error)?.message || ""}`);
          continue;
        }
        if (!upstream.ok || !upstream.body) {
          let d = "";
          try {
            const raw = await upstream.text();
            const j = raw ? JSON.parse(raw) : null;
            d = j?.error?.message || raw || "";
          } catch {
            /* bỏ qua */
          }
          debug.push(`${p.label}: ${upstream.status} ${String(d).slice(0, 160)}`);
          continue; // → thử provider kế tiếp
        }

        // 2) Đọc SSE, phát text chạy dần. Nếu có text → xong.
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let emitted = false;
        let reason = "";
        try {
          for (;;) {
            const { done: rdone, value } = await reader.read();
            if (rdone) break;
            buf += decoder.decode(value, { stream: true });
            let nl: number;
            while ((nl = buf.indexOf("\n")) !== -1) {
              const line = buf.slice(0, nl).trim();
              buf = buf.slice(nl + 1);
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              try {
                const json = JSON.parse(payload);
                const text = extractDelta(p, json);
                if (text) {
                  emitted = true;
                  controller.enqueue(encoder.encode(text));
                } else {
                  reason = finishReason(p, json) || reason;
                }
              } catch {
                /* chunk chưa trọn */
              }
            }
          }
        } catch (e) {
          debug.push(`${p.label}: stream ${(e as Error)?.message || ""}`);
        }

        if (emitted) {
          done = true;
          break;
        }
        debug.push(`${p.label}: empty${reason ? ` (${reason})` : ""}`);
        // → thử provider kế tiếp
      }

      if (!done) {
        console.error("[vieetjk/chat] all providers failed:", debug.join(" | "));
        controller.enqueue(
          encoder.encode(`${errorMsg.trim()}\n\n[DEBUG ${debug.join(" | ").slice(0, 400)}]`)
        );
      }
      controller.close();
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
