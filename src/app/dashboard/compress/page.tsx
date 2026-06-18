"use client";

import { useEffect, useRef, useState } from "react";
import {
  Link2,
  HardDrive,
  Search,
  FolderInput,
  Download,
  Image as ImageIcon,
  Type,
  Stamp,
  Minimize2,
  Save,
} from "lucide-react";
import { stripExtension } from "@/lib/drive";
import { triggerDownload } from "@/lib/download";
import {
  compressImage,
  loadImageFromBlob,
  outName,
  formatBytes,
  type OutputFormat,
  type WmPosition,
  type WatermarkOptions,
} from "@/lib/compress";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface SourceItem {
  key: string;
  name: string;
  driveId?: string;
  file?: File;
}

interface DoneItem {
  key: string;
  name: string;
  out: string;
  originalSize: number;
  newSize: number;
  blob: Blob;
}

const IMG_RE = /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif|tiff?)$/i;

export default function CompressPage() {
  const [source, setSource] = useState<"drive" | "local">("drive");
  const [fsSupported, setFsSupported] = useState(false);

  useEffect(() => {
    setFsSupported(typeof window !== "undefined" && "showDirectoryPicker" in window);
  }, []);

  // Drive source
  const [driveUrl, setDriveUrl] = useState("");
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);

  // Local source
  const [items, setItems] = useState<SourceItem[]>([]);
  const [srcLabel, setSrcLabel] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  // Compression options
  const [quality, setQuality] = useState(82);
  const [maxDim, setMaxDim] = useState(0); // 0 = keep original
  const [format, setFormat] = useState<OutputFormat>("image/jpeg");

  // Watermark options
  const [wmOn, setWmOn] = useState(false);
  const [wmType, setWmType] = useState<"text" | "image">("text");
  const [wmText, setWmText] = useState("Vieetjk");
  const [wmColor, setWmColor] = useState<"white" | "black">("white");
  const [wmPos, setWmPos] = useState<WmPosition>("bottom-right");
  const [wmOpacity, setWmOpacity] = useState(35);
  const [wmTextScale, setWmTextScale] = useState(4); // % of width
  const [wmImageScale, setWmImageScale] = useState(22); // % of width
  const [wmImg, setWmImg] = useState<HTMLImageElement | null>(null);
  const [wmImgName, setWmImgName] = useState("");
  const wmFileInput = useRef<HTMLInputElement>(null);

  // Processing / results
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<DoneItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [savingMsg, setSavingMsg] = useState<string | null>(null);

  // Daily usage quota (free accounts: 1 compress run / day; admins unlimited)
  const [quota, setQuota] = useState<{
    unlimited: boolean;
    limit: number | null;
    used: number;
    remaining: number | null;
  } | null>(null);
  const [quotaMsg, setQuotaMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/compress/use")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setQuota({ unlimited: d.unlimited, limit: d.limit, used: d.used, remaining: d.remaining }))
      .catch(() => {});
  }, []);

  const outOfQuota = !!quota && !quota.unlimited && (quota.remaining ?? 0) <= 0;

  async function loadDrive() {
    setLoadingDrive(true);
    setDriveError(null);
    try {
      const res = await fetch("/api/drive/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: driveUrl }),
      });
      const data = await res.json();
      if (data.error) {
        setDriveError(data.error);
        setItems([]);
      } else {
        setItems(
          (data.files ?? []).map((f: any) => ({ key: f.id, name: f.name, driveId: f.id }))
        );
        setSrcLabel(`${(data.files ?? []).length} ảnh từ Drive`);
        setResults([]);
      }
    } catch {
      setDriveError("Không tải được danh sách từ Drive.");
    }
    setLoadingDrive(false);
  }

  function pickLocal(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => IMG_RE.test(f.name));
    setItems(files.map((file, i) => ({ key: `${i}-${file.name}`, name: file.name, file })));
    setSrcLabel(`${files.length} ảnh đã chọn (xử lý cục bộ, không upload)`);
    setResults([]);
  }

  async function pickLocalFS() {
    try {
      const dir = await (window as any).showDirectoryPicker({ id: "vk-compress-src" });
      const picked: SourceItem[] = [];
      let i = 0;
      for await (const entry of dir.values()) {
        if (entry.kind === "file" && IMG_RE.test(entry.name)) {
          const file = await entry.getFile();
          picked.push({ key: `${i++}-${entry.name}`, name: entry.name, file });
        }
      }
      setItems(picked);
      setSrcLabel(`${dir.name} · ${picked.length} ảnh (xử lý cục bộ, không upload)`);
      setResults([]);
    } catch {
      /* cancelled */
    }
  }

  async function pickWatermarkImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const img = await loadImageFromBlob(file);
      setWmImg(img);
      setWmImgName(file.name);
    } catch {
      setWmImg(null);
      setWmImgName("");
    }
  }

  function buildWatermark(): WatermarkOptions | null {
    if (!wmOn) return null;
    return {
      type: wmType,
      position: wmPos,
      opacity: wmOpacity / 100,
      text: wmText,
      color: wmColor,
      textScale: wmTextScale / 100,
      image: wmImg,
      imageScale: wmImageScale / 100,
    };
  }

  async function run() {
    if (items.length === 0 || busy) return;
    if (wmOn && wmType === "image" && !wmImg) {
      setDriveError(null);
      alert("Hãy chọn ảnh watermark trước.");
      return;
    }

    // Consume one daily use (server-enforced). Admins / unlimited accounts pass.
    setQuotaMsg(null);
    try {
      const res = await fetch("/api/compress/use", { method: "POST" });
      const d = await res.json().catch(() => null);
      if (d) setQuota({ unlimited: d.unlimited, limit: d.limit, used: d.used, remaining: d.remaining });
      if (res.status === 401) {
        setQuotaMsg("Bạn cần đăng nhập để dùng công cụ nén ảnh.");
        return;
      }
      if (!res.ok) {
        setQuotaMsg(
          `Tài khoản của bạn chỉ được nén ${d?.limit ?? 1} lượt/ngày và hôm nay đã dùng hết. Vui lòng quay lại ngày mai hoặc liên hệ nâng cấp.`
        );
        return;
      }
    } catch {
      setQuotaMsg("Không kiểm tra được hạn mức sử dụng. Thử lại sau.");
      return;
    }

    setBusy(true);
    setResults([]);
    setProgress({ done: 0, total: items.length });
    const watermark = buildWatermark();
    const fetchW = maxDim > 0 ? maxDim : 5000;
    const out: DoneItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      try {
        let img: HTMLImageElement;
        let originalSize = 0;
        if (it.driveId) {
          const res = await fetch(`/api/img?id=${encodeURIComponent(it.driveId)}&w=${fetchW}`);
          const blob = await res.blob();
          originalSize = blob.size;
          img = await loadImageFromBlob(blob);
        } else if (it.file) {
          originalSize = it.file.size;
          img = await loadImageFromBlob(it.file);
        } else {
          continue;
        }
        const r = await compressImage(img, {
          quality: quality / 100,
          maxDim,
          format,
          watermark,
        });
        out.push({
          key: it.key,
          name: it.name,
          out: outName(it.name, format),
          originalSize,
          newSize: r.blob.size,
          blob: r.blob,
        });
      } catch {
        /* skip files that fail */
      }
      setProgress({ done: i + 1, total: items.length });
    }

    setResults(out);
    setProgress(null);
    setBusy(false);
  }

  async function downloadZip() {
    if (results.length === 0) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const r of results) zip.file(r.out, r.blob);
    const blob = await zip.generateAsync({ type: "blob" });
    triggerDownload(blob, "anh-da-nen.zip");
  }

  async function saveToFolder() {
    if (results.length === 0) return;
    try {
      const dir = await (window as any).showDirectoryPicker({
        id: "vk-compress-dest",
        mode: "readwrite",
      });
      setSavingMsg("Đang lưu…");
      let done = 0;
      for (const r of results) {
        const fh = await dir.getFileHandle(r.out, { create: true });
        const w = await fh.createWritable();
        await w.write(r.blob);
        await w.close();
        done++;
        setSavingMsg(`Đang lưu… ${done}/${results.length}`);
      }
      setSavingMsg(`Đã lưu ${done}/${results.length} ảnh vào “${dir.name}”.`);
    } catch {
      setSavingMsg(null);
    }
  }

  // Totals
  const totalOriginal = results.reduce((s, r) => s + r.originalSize, 0);
  const totalNew = results.reduce((s, r) => s + r.newSize, 0);
  const savedPct =
    totalOriginal > 0 ? Math.round((1 - totalNew / totalOriginal) * 100) : 0;

  const tab = (key: "drive" | "local", label: string, Icon: typeof Link2) => (
    <button
      onClick={() => setSource(key)}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px]"
      style={
        source === key
          ? { background: "var(--accent)", color: "var(--accentInk)" }
          : { background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }
      }
    >
      <Icon size={14} /> {label}
    </button>
  );

  const posOptions: { v: WmPosition; label: string }[] = [
    { v: "bottom-right", label: "Góc dưới phải" },
    { v: "bottom-left", label: "Góc dưới trái" },
    { v: "top-right", label: "Góc trên phải" },
    { v: "top-left", label: "Góc trên trái" },
    { v: "bottom-center", label: "Giữa dưới" },
    { v: "center", label: "Chính giữa" },
    { v: "tile", label: "Lát kín (chéo)" },
  ];

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-8">
        <p className="eyebrow mb-1.5">Công cụ</p>
        <h1 className="font-serif text-[clamp(28px,4vw,44px)] font-medium leading-none">Nén ảnh</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed" style={{ color: "var(--text2)" }}>
          Giảm dung lượng ảnh mà vẫn giữ chất lượng — từ <b>link Google Drive công khai</b> hoặc{" "}
          <b>file trên máy tính</b>. Có thể gắn kèm <b>watermark</b> bằng chữ hoặc ảnh logo. Toàn bộ
          xử lý ngay trên trình duyệt, ảnh không được tải lên máy chủ. Tài khoản miễn phí được nén{" "}
          <b>1 lượt/ngày</b>.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Source */}
        <div className="card p-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wide" style={{ color: "var(--text2)" }}>
            <FolderInput size={15} /> Nguồn ảnh
          </h2>
          <div className="mb-3 flex gap-2">
            {tab("drive", "Google Drive", Link2)}
            {tab("local", "Máy tính", HardDrive)}
          </div>

          {source === "drive" ? (
            <>
              <div className="flex gap-2.5">
                <input
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="input"
                />
                <button onClick={loadDrive} disabled={loadingDrive || !driveUrl.trim()} className="btn-primary whitespace-nowrap">
                  <Search size={15} /> {loadingDrive ? "Đang tải…" : "Tải ảnh"}
                </button>
              </div>
              {driveError && <p className="mt-3 text-sm text-red-400">{driveError}</p>}
            </>
          ) : (
            <>
              <button
                onClick={() => (fsSupported ? pickLocalFS() : fileInput.current?.click())}
                className="btn-ghost w-full py-3"
              >
                <FolderInput size={16} /> Chọn ảnh / thư mục
              </button>
              <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={pickLocal} />
            </>
          )}
          {srcLabel && (
            <p className="mt-3 text-[13px]" style={{ color: "var(--text2)" }}>
              {srcLabel}
            </p>
          )}
        </div>

        {/* Compression options */}
        <div className="card p-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wide" style={{ color: "var(--text2)" }}>
            <Minimize2 size={15} /> Tuỳ chọn nén
          </h2>

          <label className="mb-1 block text-[13px]" style={{ color: "var(--text2)" }}>
            Chất lượng: <b style={{ color: "var(--text)" }}>{quality}</b>
            <span style={{ color: "var(--text3)" }}> (cao = nét hơn, nặng hơn)</span>
          </label>
          <input type="range" min={40} max={100} value={quality} onChange={(e) => setQuality(+e.target.value)} className="w-full accent-[var(--gold)]" />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[13px]" style={{ color: "var(--text2)" }}>Kích thước tối đa</label>
              <select value={maxDim} onChange={(e) => setMaxDim(+e.target.value)} className="input">
                <option value={0}>Giữ nguyên</option>
                <option value={4000}>4000 px</option>
                <option value={3000}>3000 px</option>
                <option value={2560}>2560 px</option>
                <option value={2048}>2048 px</option>
                <option value={1920}>1920 px</option>
                <option value={1280}>1280 px</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[13px]" style={{ color: "var(--text2)" }}>Định dạng</label>
              <select value={format} onChange={(e) => setFormat(e.target.value as OutputFormat)} className="input">
                <option value="image/jpeg">JPEG (tương thích nhất)</option>
                <option value="image/webp">WebP (nhẹ hơn ~30%)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Watermark */}
      <div className="mt-5 card p-6">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium uppercase tracking-wide" style={{ color: "var(--text2)" }}>
          <input type="checkbox" checked={wmOn} onChange={(e) => setWmOn(e.target.checked)} className="h-4 w-4 accent-[var(--gold)]" />
          <Stamp size={15} /> Gắn watermark (tuỳ chọn)
        </label>

        {wmOn && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-3 flex gap-2">
                <button onClick={() => setWmType("text")} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px]" style={wmType === "text" ? { background: "var(--accent)", color: "var(--accentInk)" } : { background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
                  <Type size={14} /> Chữ
                </button>
                <button onClick={() => setWmType("image")} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px]" style={wmType === "image" ? { background: "var(--accent)", color: "var(--accentInk)" } : { background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
                  <ImageIcon size={14} /> Ảnh / Logo
                </button>
              </div>

              {wmType === "text" ? (
                <>
                  <input value={wmText} onChange={(e) => setWmText(e.target.value)} placeholder="Chữ watermark" className="input" />
                  <div className="mt-3 flex items-center gap-3">
                    <label className="text-[13px]" style={{ color: "var(--text2)" }}>Màu chữ</label>
                    <select value={wmColor} onChange={(e) => setWmColor(e.target.value as "white" | "black")} className="input w-auto px-2 py-1 text-xs">
                      <option value="white">Trắng</option>
                      <option value="black">Đen</option>
                    </select>
                  </div>
                  <label className="mt-3 block text-[13px]" style={{ color: "var(--text2)" }}>Cỡ chữ: <b style={{ color: "var(--text)" }}>{wmTextScale}%</b> bề ngang</label>
                  <input type="range" min={2} max={12} value={wmTextScale} onChange={(e) => setWmTextScale(+e.target.value)} className="w-full accent-[var(--gold)]" />
                </>
              ) : (
                <>
                  <button onClick={() => wmFileInput.current?.click()} className="btn-ghost w-full py-2.5">
                    <ImageIcon size={15} /> {wmImgName ? "Đổi ảnh watermark" : "Chọn ảnh watermark (PNG trong suốt)"}
                  </button>
                  <input ref={wmFileInput} type="file" accept="image/*" hidden onChange={pickWatermarkImage} />
                  {wmImgName && <p className="mt-2 text-[12.5px]" style={{ color: "var(--text2)" }}>Logo: <b>{wmImgName}</b></p>}
                  <label className="mt-3 block text-[13px]" style={{ color: "var(--text2)" }}>Kích cỡ logo: <b style={{ color: "var(--text)" }}>{wmImageScale}%</b> bề ngang</label>
                  <input type="range" min={5} max={60} value={wmImageScale} onChange={(e) => setWmImageScale(+e.target.value)} className="w-full accent-[var(--gold)]" />
                </>
              )}
            </div>

            <div>
              <label className="mb-1 block text-[13px]" style={{ color: "var(--text2)" }}>Vị trí</label>
              <select value={wmPos} onChange={(e) => setWmPos(e.target.value as WmPosition)} className="input">
                {posOptions.map((o) => (
                  <option key={o.v} value={o.v}>{o.label}</option>
                ))}
              </select>
              <label className="mt-3 block text-[13px]" style={{ color: "var(--text2)" }}>Độ mờ: <b style={{ color: "var(--text)" }}>{wmOpacity}%</b></label>
              <input type="range" min={5} max={100} value={wmOpacity} onChange={(e) => setWmOpacity(+e.target.value)} className="w-full accent-[var(--gold)]" />
            </div>
          </div>
        )}
      </div>

      {/* Action + results */}
      <div className="mt-6 card p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button onClick={run} disabled={items.length === 0 || busy || outOfQuota} className="btn-primary disabled:opacity-40">
            <Minimize2 size={15} />
            {busy && progress ? `Đang nén… ${progress.done}/${progress.total}` : `Nén ${items.length || ""} ảnh`}
          </button>
          {quota && (
            <span className="text-[12.5px]" style={{ color: outOfQuota ? "#fbbf24" : "var(--text3)" }}>
              {quota.unlimited
                ? "Không giới hạn lượt nén"
                : `Hôm nay: đã dùng ${quota.used}/${quota.limit} lượt`}
            </span>
          )}
          {results.length > 0 && (
            <>
              <button onClick={downloadZip} className="btn-ghost text-[13px]">
                <Download size={14} /> Tải ZIP ({results.length})
              </button>
              {fsSupported && (
                <button onClick={saveToFolder} className="btn-ghost text-[13px]">
                  <Save size={14} /> Lưu vào thư mục…
                </button>
              )}
            </>
          )}
          {results.length > 0 && (
            <span className="ml-auto rounded-full px-3 py-1 text-[12.5px]" style={{ background: "color-mix(in srgb, var(--gold) 16%, transparent)", color: "var(--gold)" }}>
              {formatBytes(totalOriginal)} → {formatBytes(totalNew)} · giảm {savedPct}%
            </span>
          )}
        </div>
        {quotaMsg && (
          <p className="mb-3 rounded-lg px-3 py-2 text-[13px]" style={{ background: "color-mix(in srgb,#f59e0b 14%,transparent)", color: "#fbbf24" }}>
            {quotaMsg}
          </p>
        )}
        {savingMsg && <p className="mb-3 text-[13px]" style={{ color: "var(--gold)" }}>{savingMsg}</p>}

        {results.length === 0 ? (
          <p className="py-10 text-center text-sm" style={{ color: "var(--text3)" }}>
            {items.length === 0
              ? "Chọn nguồn ảnh để bắt đầu."
              : busy
              ? "Đang xử lý…"
              : `Sẵn sàng nén ${items.length} ảnh. Bấm “Nén ảnh”.`}
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}>
            {results.map((r, i) => {
              const pct = r.originalSize > 0 ? Math.round((1 - r.newSize / r.originalSize) * 100) : 0;
              return (
                <div
                  key={r.key}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13px]"
                  style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)", color: "var(--text2)" }}
                >
                  <span className="min-w-0 flex-1 truncate" title={r.name} style={{ color: "var(--text)" }}>
                    {stripExtension(r.name)}
                  </span>
                  <span className="whitespace-nowrap" style={{ color: "var(--text3)" }}>
                    {formatBytes(r.originalSize)} → {formatBytes(r.newSize)}
                  </span>
                  <span
                    className="w-14 whitespace-nowrap text-right"
                    style={{ color: pct > 0 ? "var(--gold)" : "var(--text3)" }}
                  >
                    {pct > 0 ? `−${pct}%` : "—"}
                  </span>
                  <button
                    onClick={() => triggerDownload(r.blob, r.out)}
                    className="rounded-md p-1.5"
                    style={{ color: "var(--text2)" }}
                    title="Tải ảnh này"
                  >
                    <Download size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
