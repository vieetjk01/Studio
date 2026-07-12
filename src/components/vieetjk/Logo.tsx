import { VJK_RED, BRAND } from "@/lib/vieetjk/content";

/**
 * Logo Vieetjk: tam giác "play" màu đỏ + wordmark.
 * variant="full" hiện cả chữ; "mark" chỉ hiện tam giác.
 */
export default function Logo({
  variant = "full",
  color,
}: {
  variant?: "full" | "mark";
  color?: string;
}) {
  const ink = color ?? "currentColor";
  return (
    <span className="vjk-logo" aria-label={BRAND.name}>
      <svg viewBox="0 0 40 40" width="26" height="26" aria-hidden="true" focusable="false">
        <path d="M13 8.5c0-1.6 1.75-2.55 3.08-1.68l16.5 10.9c1.2.8 1.2 2.57 0 3.36l-16.5 10.9C14.75 33.05 13 32.1 13 30.5V8.5Z" fill={VJK_RED} />
      </svg>
      {variant === "full" && (
        <span className="vjk-logo-text" style={{ color: ink }}>
          <span className="vjk-logo-name">{BRAND.name}</span>
        </span>
      )}
    </span>
  );
}
