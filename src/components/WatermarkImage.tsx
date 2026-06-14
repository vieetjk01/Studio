"use client";

interface Props {
  src: string;
  alt: string;
  watermark?: string | null;
  className?: string;
  onClick?: () => void;
}

/**
 * Image with a tiled, diagonal watermark overlay. The overlay sits above the
 * image and ignores pointer events so selection clicks still register on the
 * parent. It deters casual right-click saving of the clean image.
 */
export default function WatermarkImage({
  src,
  alt,
  watermark,
  className = "",
  onClick,
}: Props) {
  return (
    <div
      className={`relative overflow-hidden bg-ink-850 ${className}`}
      onClick={onClick}
      onContextMenu={(e) => watermark && e.preventDefault()}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        draggable={false}
        className="h-full w-full select-none object-cover"
      />
      {watermark ? (
        <div className="pointer-events-none absolute inset-0 flex flex-wrap content-center items-center justify-center gap-x-10 gap-y-8 opacity-25">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="rotate-[-30deg] whitespace-nowrap text-sm font-semibold tracking-widest text-white drop-shadow"
            >
              {watermark}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
