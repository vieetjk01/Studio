"use client";

import { useEffect, useRef, useState } from "react";

type Anim = "up" | "zoom" | "left" | "right" | "fade";

/**
 * Scroll-reveal wrapper: children start hidden and animate in when they enter
 * the viewport (IntersectionObserver). Pure CSS transition — no library.
 */
export default function Reveal({
  children,
  anim = "up",
  delay = 0,
  className = "",
  style,
}: {
  children: React.ReactNode;
  anim?: Anim;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) { setShown(true); io.disconnect(); }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const hidden: Record<Anim, string> = {
    up: "translateY(34px)",
    zoom: "scale(0.94)",
    left: "translateX(-40px)",
    right: "translateX(40px)",
    fade: "none",
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : hidden[anim],
        transition: `opacity .7s ease ${delay}ms, transform .8s cubic-bezier(.16,.8,.3,1) ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
