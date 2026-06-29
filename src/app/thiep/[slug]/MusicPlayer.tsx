"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Pause } from "lucide-react";

/**
 * Floating background-music toggle. Tries to autoplay (browsers usually block
 * it until the first interaction), and lets the guest start/stop the music.
 */
export default function MusicPlayer({ url, autoplay }: { url: string; autoplay?: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!autoplay || !ref.current) return;
    ref.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [autoplay]);

  // Some browsers only allow audio after a user gesture — start on first tap.
  useEffect(() => {
    if (!autoplay) return;
    const start = () => {
      ref.current?.play().then(() => setPlaying(true)).catch(() => {});
      window.removeEventListener("pointerdown", start);
    };
    window.addEventListener("pointerdown", start, { once: true });
    return () => window.removeEventListener("pointerdown", start);
  }, [autoplay]);

  function toggle() {
    const a = ref.current;
    if (!a) return;
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {});
    else { a.pause(); setPlaying(false); }
  }

  return (
    <>
      <audio ref={ref} src={url} loop preload="none" />
      <button
        onClick={toggle}
        aria-label="Nhạc nền"
        className="fixed bottom-5 right-5 z-50 grid h-12 w-12 place-items-center rounded-full text-white shadow-lg transition active:scale-95"
        style={{ background: "var(--wed-accent)" }}
      >
        <span className={playing ? "animate-spin-slow" : ""}>{playing ? <Pause size={18} /> : <Music size={18} />}</span>
      </button>
      <style>{`@keyframes wed-spin{to{transform:rotate(360deg)}}.animate-spin-slow{display:inline-flex;animation:wed-spin 3s linear infinite}`}</style>
    </>
  );
}
