"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";

// Date field that always SHOWS dd/mm/yyyy (regardless of browser locale) while
// emitting an ISO yyyy-mm-dd string via onChange. A calendar button opens the
// native picker for convenience. Emits "" when the field is empty/incomplete.

function isoToDisplay(iso: string): string {
  const m = (iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}
function displayToIso(s: string): string {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return "";
  const d = +m[1], mo = +m[2], y = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return "";
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function DateInput({
  value,
  onChange,
  className = "input",
  wrapperClassName = "",
  placeholder = "dd/mm/yyyy",
  id,
  disabled = false,
}: {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  wrapperClassName?: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState(() => isoToDisplay(value));
  const picker = useRef<HTMLInputElement>(null);
  // Keep the displayed text in sync when the value changes from outside.
  useEffect(() => { setText(isoToDisplay(value)); }, [value]);

  function handleText(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 8);
    let out = digits;
    if (digits.length >= 5) out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length >= 3) out = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setText(out);
    onChange(displayToIso(out));
  }

  return (
    <div className={wrapperClassName} style={{ position: "relative", width: "100%" }}>
      <input
        id={id}
        className={className}
        style={{ width: "100%", paddingRight: 34 }}
        inputMode="numeric"
        placeholder={placeholder}
        value={text}
        disabled={disabled}
        onChange={(e) => handleText(e.target.value)}
      />
      <button
        type="button"
        aria-label="Chọn ngày"
        disabled={disabled}
        onClick={() => { const p = picker.current; if (p?.showPicker) p.showPicker(); else p?.focus(); }}
        style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", display: "inline-flex" }}
      >
        <Calendar size={15} />
      </button>
      <input
        ref={picker}
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden
        style={{ position: "absolute", right: 6, bottom: 0, width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      />
    </div>
  );
}
