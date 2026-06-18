"use client";

import { useRef, useState } from "react";
import {
  Link2,
  HardDrive,
  Search,
  FolderInput,
  Download,
  Image as ImageIcon,
  Type,
  Minimize2,
  Save,
  CloudUpload,
  Eye,
} from "lucide-react";
import { stripExtension } from "@/lib/drive";
import { triggerDownload } from "@/lib/download";
import {
  overwriteDriveFile,
  createDriveFile,
  getDriveParent,
  DriveAuthError,
} from "@/lib/drive-write";
import {
  pickerConfigured,
  openDrivePicker,
  listFolderImages,
  fetchDriveBytes,
} from "@/lib/google-picker";
import {
  compressImage,
  loadImageFromBlob,
  outName,
  formatExt,
  formatBytes,
  type OutputFormat,
  type WmPosition,
  type WatermarkOptions,
} from "@/lib/compress";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Tool = "compress" | "watermark" | "convert";

interface Q {
  unlimited: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
}
export interface QuotaState {
  basic: Q;
  picker: Q;
}

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
  driveId?: string;
  originalSize: number;
  newSize: number;
  blob: Blob;
}

type SourceKind = "local" | "link" | "picker";

const IMG_RE = /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif|tiff?)$/i;

const POS_OPTIONS: { v: WmPosition; label: string }[] = [
  { v: "bottom-right", label: "Góc dưới phải" },
  { v: "bottom-left", label: "Góc dưới trái" },
  { v: "top-right", label: "Góc trên phải" },
  { v: "top-left", label: "Góc trên trái" },
  { v: "bottom-center", label: "Giữa dưới" },
  { v: "center", label: "Chính giữa" },
  { v: "tile", label: "Lát kín (chéo)" },
];

export default function ToolPanel({
  tool,
  ensureDriveToken,
  quota,
  consumeQuota,
}: {
  tool: Tool;
  ensureDriveToken: (force?: boolean) => Promise<string>;
  quota: QuotaState | null;
  consumeQuota: (kind: "basic" | "picker") => Promise<{ ok: boolean; status: number; data: any }>;
}) {
  const allowPicker = tool === "compress" && pickerConfigured;

  const [source, setSource] = useState<SourceKind>("local");
  const [items, setItems] = useState<SourceItem[]>([]);
  const [srcLabel, setSrcLabel] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  // Drive link
  const [driveUrl, setDriveUrl] = useState("");
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  // Compress options
  const [quality, setQuality] = useState(82);
  const [maxDim, setMaxDim] = useState(0);
  const [format, setFormat] = useState<OutputFormat>("image/jpeg");
  // Convert option
  const [targetFormat, setTargetFormat] = useState<OutputFormat>("image/webp");
  // Picker write mode
  const [writeMode, setWriteMode] = useState<"overwrite" | "new">("new");

  // Watermark options
  const [wmType, setWmType] = useState<"text" | "image">("text");
  const [wmText, setWmText] = useState("Vieetjk");
  const [wmColor, setWmColor] = useState<"white" | "black">("white");
  const [wmPos, setWmPos] = useState<WmPosition>("bottom-right");
  const [wmOpacity, setWmOpacity] = useState(35);
  const [wmTextScale, setWmTextScale] = useState(4);
  const [wmImageScale, setWmImageScale] = useState(22);
  const [wmImg, setWmImg] = useState<HTMLImageElement | null>(null);
  const [wmImgName, setWmImgName] = useState("");
  const wmFileInput = useRef<HTMLInputElement>(null);

  // Processing / results
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<DoneItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [savingMsg, setSavingMsg] = useState<string | null>(null);
  const [quotaMsg, setQuotaMsg] = useState<string | null>(null);
  const [writeMsg, setWriteMsg] = useState<string | null>(null);

  // Preview
  const [preview, setPreview] = useState<
    { url: string; origSize: number; newSize: number; label: string } | null
  >(null);
  const [previewing, setPreviewing] = useState(false);

  const isPicker = source === "picker";
  const activeQuota = tool === "compress" ? (isPicker ? quota?.picker : quota?.basic) : null;
  const outOfQuota = !!activeQuota && !activeQuota.unlimited && (activeQuota.remaining ?? 0) <= 0;
  const [fsSupported] = useState(
    typeof window !== "undefined" && "showDirectoryPicker" in window
  );

  // ── Sources ──────────────────────────────────────────────────
  function resetOutputs() {
    setResults([]);
    setPreview(null);
    setWriteMsg(null);
    setSavingMsg(null);
  }

  function pickLocal(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => IMG_RE.test(f.name));
    setItems(files.map((file, i) => ({ key: `${i}-${file.name}`, name: file.name, file })));
    setSrcLabel(`${files.length} ảnh đã chọn (xử lý cục bộ, không upload)`);
    resetOutputs();
  }

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
        setItems((data.files ?? []).map((f: any) => ({ key: f.id, name: f.name, driveId: f.id })));
        setSrcLabel(`${(data.files ?? []).length} ảnh từ Drive (link công khai)`);
        resetOutputs();
      }
    } catch {
      setDriveError("Không tải được danh sách từ Drive.");
    }
    setLoadingDrive(false);
  }

  async function pickFromDrive() {
    if (picking) return;
    setPicking(true);
    setDriveError(null);
    try {
      const token = await ensureDriveToken();
      const picked = await openDrivePicker(token);
      if (picked.length === 0) {
        setPicking(false);
        return;
      }
      const files: SourceItem[] = [];
      for (const p of picked) {
        if (p.isFolder) {
          const kids = await listFolderImages(token, p.id);
          files.push(...kids.map((f) => ({ key: f.id, name: f.name, driveId: f.id })));
        } else {
          files.push({ key: p.id, name: p.name, driveId: p.id });
        }
      }
      const seen = new Set<string>();
      const uniq = files.filter((f) => (seen.has(f.key) ? false : (seen.add(f.key), true)));
      setItems(uniq);
      setSrcLabel(`${uniq.length} ảnh từ Google Drive (đã cấp quyền ghi)`);
      resetOutputs();
    } catch (e: any) {
      const detail = e?.message || e?.type || "";
      setDriveError(
        detail === "drive_unauthorized"
          ? "Cần cấp lại quyền Google Drive."
          : `Không mở được Google Drive${detail ? ` (lỗi: ${detail})` : ""}. Kiểm tra cấu hình Google.`
      );
    }
    setPicking(false);
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

  // ── Per-tool processing options ──────────────────────────────
  function buildWatermark(): WatermarkOptions {
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
  function optionsFor(): { quality: number; maxDim: number; format: OutputFormat; watermark: WatermarkOptions | null } {
    if (tool === "compress") return { quality: quality / 100, maxDim, format, watermark: null };
    if (tool === "watermark") return { quality: 0.92, maxDim: 0, format, watermark: buildWatermark() };
    return { quality: 0.95, maxDim: 0, format: targetFormat, watermark: null }; // convert
  }
  const outputFormat = tool === "convert" ? targetFormat : format;

  async function getBlob(it: SourceItem, fetchW: number): Promise<Blob> {
    if (it.file) return it.file;
    if (it.driveId) {
      if (source === "picker") {
        const token = await ensureDriveToken();
        return fetchDriveBytes(token, it.driveId);
      }
      const res = await fetch(`/api/img?id=${encodeURIComponent(it.driveId)}&w=${fetchW}`);
      return res.blob();
    }
    throw new Error("no_source");
  }

  // ── Preview (no quota, no Drive write) ───────────────────────
  async function runPreview() {
    if (items.length === 0 || previewing) return;
    setPreviewing(true);
    setDriveError(null);
    if (tool === "watermark" && wmType === "image" && !wmImg) {
      alert("Hãy chọn ảnh watermark trước.");
      setPreviewing(false);
      return;
    }
    try {
      const it = items[0];
      const opts = optionsFor();
      const fetchW = opts.maxDim > 0 ? opts.maxDim : 5000;
      const blob = await getBlob(it, fetchW);
      const img = await loadImageFromBlob(blob);
      const r = await compressImage(img, opts);
      if (preview) URL.revokeObjectURL(preview.url);
      setPreview({
        url: URL.createObjectURL(r.blob),
        origSize: blob.size,
        newSize: r.blob.size,
        label: stripExtension(it.name),
      });
    } catch (e: any) {
      setDriveError(`Không xem trước được${e?.message ? ` (${e.message})` : ""}.`);
    }
    setPreviewing(false);
  }

  // ── Main run ─────────────────────────────────────────────────
  async function writeOneToDrive(tok: string, r: DoneItem) {
    if (writeMode === "overwrite") {
      await overwriteDriveFile(tok, r.driveId!, r.blob);
    } else {
      const { parentId } = await getDriveParent(tok, r.driveId!);
      if (!parentId) throw new Error("no_parent");
      await createDriveFile(tok, parentId, `${stripExtension(r.name)}_nen.${formatExt(outputFormat)}`, r.blob);
    }
  }

  async function run() {
    if (items.length === 0 || busy) return;
    if (tool === "watermark" && wmType === "image" && !wmImg) {
      alert("Hãy chọn ảnh watermark trước.");
      return;
    }
    setQuotaMsg(null);
    setWriteMsg(null);

    // Quota only applies to the compress tool.
    if (tool === "compress") {
      const kind = isPicker ? "picker" : "basic";
      const { ok, status, data } = await consumeQuota(kind);
      if (status === 401) {
        setQuotaMsg("Bạn cần đăng nhập để dùng công cụ này.");
        return;
      }
      if (!ok) {
        const lim = kind === "picker" ? data?.picker?.limit : data?.basic?.limit;
        setQuotaMsg(
          kind === "picker"
            ? `Tài khoản miễn phí chỉ được dùng thử nén qua Google Drive ${lim ?? 1} lần. Vui lòng liên hệ nâng cấp.`
            : `Tài khoản của bạn chỉ được nén ${lim ?? 2} lượt/ngày và hôm nay đã dùng hết. Quay lại ngày mai hoặc liên hệ nâng cấp.`
        );
        return;
      }
    }

    setBusy(true);
    setResults([]);
    setPreview(null);
    setProgress({ done: 0, total: items.length });
    const opts = optionsFor();
    const fetchW = opts.maxDim > 0 ? opts.maxDim : 5000;
    const out: DoneItem[] = [];
    let written = 0;
    let token = "";
    if (tool === "compress" && isPicker) {
      try {
        token = await ensureDriveToken();
      } catch {
        setWriteMsg("Cần cấp quyền Google Drive.");
        setBusy(false);
        setProgress(null);
        return;
      }
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      try {
        const blob = await getBlob(it, fetchW);
        const img = await loadImageFromBlob(blob);
        const r = await compressImage(img, opts);
        const done: DoneItem = {
          key: it.key,
          name: it.name,
          out: outName(it.name, outputFormat),
          driveId: it.driveId,
          originalSize: blob.size,
          newSize: r.blob.size,
          blob: r.blob,
        };
        out.push(done);
        // Picker compress: write back to Drive automatically (no extra prompt).
        if (tool === "compress" && isPicker && it.driveId) {
          try {
            await writeOneToDrive(token, done);
            written++;
          } catch (e) {
            if (e instanceof DriveAuthError) {
              token = await ensureDriveToken(true);
              await writeOneToDrive(token, done);
              written++;
            }
          }
        }
      } catch {
        /* skip failed file */
      }
      setProgress({ done: i + 1, total: items.length });
    }

    setResults(out);
    setProgress(null);
    setBusy(false);
    if (tool === "compress" && isPicker) {
      setWriteMsg(
        writeMode === "overwrite"
          ? `Đã nén & ghi đè ${written}/${items.length} ảnh lên Drive (giữ nguyên tên & link).`
          : `Đã nén & lưu ${written}/${items.length} bản mới (đuôi _nen) vào Drive.`
      );
    }
  }

  // ── Output (local/link only) ─────────────────────────────────
  async function downloadZip() {
    if (results.length === 0) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const r of results) zip.file(r.out, r.blob);
    const blob = await zip.generateAsync({ type: "blob" });
    triggerDownload(blob, tool === "convert" ? "anh-doi-dinh-dang.zip" : tool === "watermark" ? "anh-watermark.zip" : "anh-da-nen.zip");
  }
  async function saveToFolder() {
    if (results.length === 0) return;
    try {
      const dir = await (window as any).showDirectoryPicker({ id: "vk-img-dest", mode: "readwrite" });
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

  const totalOriginal = results.reduce((s, r) => s + r.originalSize, 0);
  const totalNew = results.reduce((s, r) => s + r.newSize, 0);
  const savedPct = totalOriginal > 0 ? Math.round((1 - totalNew / totalOriginal) * 100) : 0;

  const runLabel =
    tool === "watermark" ? "Gắn watermark" : tool === "convert" ? "Chuyển đổi" : isPicker ? "Nén & ghi lên Drive" : "Nén ảnh";

  // ── Source tab buttons ───────────────────────────────────────
  const srcTab = (key: SourceKind, label: string, Icon: typeof Link2) => (
    <button
      onClick={() => {
        setSource(key);
        setItems([]);
        setSrcLabel("");
        resetOutputs();
      }}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px]"
      style={source === key ? { background: "var(--accent)", color: "var(--accentInk)" } : { background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}
    >
      <Icon size={14} /> {label}
    </button>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Source */}
      <div className="card p-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wide" style={{ color: "var(--text2)" }}>
          <FolderInput size={15} /> Nguồn ảnh
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {srcTab("local", "Máy tính", HardDrive)}
          {srcTab("link", "Link Drive", Link2)}
          {allowPicker && srcTab("picker", "Google Drive (ghi lại)", CloudUpload)}
        </div>

        {source === "local" && (
          <>
            <button onClick={() => fileInput.current?.click()} className="btn-ghost w-full py-3">
              <FolderInput size={16} /> Chọn ảnh
            </button>
            <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={pickLocal} />
          </>
        )}

        {source === "link" && (
          <>
            <div className="flex gap-2.5">
              <input value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} placeholder="https://drive.google.com/drive/folders/..." className="input" />
              <button onClick={loadDrive} disabled={loadingDrive || !driveUrl.trim()} className="btn-primary whitespace-nowrap">
                <Search size={15} /> {loadingDrive ? "Đang tải…" : "Tải ảnh"}
              </button>
            </div>
            <p className="mt-2 text-[12px]" style={{ color: "var(--text3)" }}>Folder phải chia sẻ <b>công khai</b> (Anyone with the link).</p>
          </>
        )}

        {source === "picker" && (
          <>
            <button onClick={pickFromDrive} disabled={picking} className="btn-primary w-full py-3 disabled:opacity-40">
              <CloudUpload size={16} /> {picking ? "Đang mở Drive…" : "Chọn từ Google Drive"}
            </button>
            <p className="mt-2 text-[12px]" style={{ color: "var(--text3)" }}>
              Đăng nhập Google của bạn, chọn ảnh/thư mục (kể cả Drive riêng tư). Kết quả nén sẽ tự ghi lại lên Drive theo lựa chọn bên dưới.
            </p>
          </>
        )}

        {driveError && <p className="mt-3 text-sm text-red-400">{driveError}</p>}
        {srcLabel && <p className="mt-3 text-[13px]" style={{ color: "var(--text2)" }}>{srcLabel}</p>}
      </div>

      {/* Options */}
      <div className="card p-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wide" style={{ color: "var(--text2)" }}>
          <Minimize2 size={15} /> Tuỳ chọn
        </h2>

        {tool === "compress" && (
          <>
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
                  <option value="image/jpeg">JPEG</option>
                  <option value="image/webp">WebP (nhẹ hơn)</option>
                </select>
              </div>
            </div>
            {isPicker && (
              <div className="mt-4 rounded-lg p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <p className="mb-2 text-[13px] font-medium" style={{ color: "var(--text2)" }}>Sau khi nén, ghi lên Drive:</p>
                <label className="flex items-center gap-2 text-[13px]" style={{ color: "var(--text)" }}>
                  <input type="radio" name="wm" checked={writeMode === "new"} onChange={() => setWriteMode("new")} className="accent-[var(--gold)]" />
                  Lưu bản nén mới (đuôi <code>_nen</code>, giữ ảnh gốc)
                </label>
                <label className="mt-1.5 flex items-center gap-2 text-[13px]" style={{ color: "var(--text)" }}>
                  <input type="radio" name="wm" checked={writeMode === "overwrite"} onChange={() => setWriteMode("overwrite")} className="accent-[var(--gold)]" />
                  <span style={{ color: "#fbbf24" }}>Ghi đè bản gốc</span> (không hoàn tác)
                </label>
              </div>
            )}
          </>
        )}

        {tool === "convert" && (
          <>
            <label className="mb-1 block text-[13px]" style={{ color: "var(--text2)" }}>Chuyển sang định dạng</label>
            <select value={targetFormat} onChange={(e) => setTargetFormat(e.target.value as OutputFormat)} className="input">
              <option value="image/jpeg">JPEG (.jpg)</option>
              <option value="image/png">PNG (.png)</option>
              <option value="image/webp">WebP (.webp)</option>
            </select>
            <p className="mt-2 text-[12px]" style={{ color: "var(--text3)" }}>
              Chuyển giữa JPEG / PNG / WebP, giữ chất lượng cao. (Đầu vào HEIC/RAW có thể không hỗ trợ tuỳ trình duyệt.)
            </p>
          </>
        )}

        {tool === "watermark" && (
          <>
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
                <label className="mt-3 block text-[13px]" style={{ color: "var(--text2)" }}>Cỡ chữ: <b style={{ color: "var(--text)" }}>{wmTextScale}%</b></label>
                <input type="range" min={2} max={12} value={wmTextScale} onChange={(e) => setWmTextScale(+e.target.value)} className="w-full accent-[var(--gold)]" />
              </>
            ) : (
              <>
                <button onClick={() => wmFileInput.current?.click()} className="btn-ghost w-full py-2.5">
                  <ImageIcon size={15} /> {wmImgName ? "Đổi ảnh watermark" : "Chọn ảnh watermark (PNG trong suốt)"}
                </button>
                <input ref={wmFileInput} type="file" accept="image/*" hidden onChange={pickWatermarkImage} />
                {wmImgName && <p className="mt-2 text-[12.5px]" style={{ color: "var(--text2)" }}>Logo: <b>{wmImgName}</b></p>}
                <label className="mt-3 block text-[13px]" style={{ color: "var(--text2)" }}>Kích cỡ logo: <b style={{ color: "var(--text)" }}>{wmImageScale}%</b></label>
                <input type="range" min={5} max={60} value={wmImageScale} onChange={(e) => setWmImageScale(+e.target.value)} className="w-full accent-[var(--gold)]" />
              </>
            )}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[13px]" style={{ color: "var(--text2)" }}>Vị trí</label>
                <select value={wmPos} onChange={(e) => setWmPos(e.target.value as WmPosition)} className="input">
                  {POS_OPTIONS.map((o) => (<option key={o.v} value={o.v}>{o.label}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[13px]" style={{ color: "var(--text2)" }}>Định dạng xuất</label>
                <select value={format} onChange={(e) => setFormat(e.target.value as OutputFormat)} className="input">
                  <option value="image/jpeg">JPEG</option>
                  <option value="image/webp">WebP</option>
                  <option value="image/png">PNG</option>
                </select>
              </div>
            </div>
            <label className="mt-3 block text-[13px]" style={{ color: "var(--text2)" }}>Độ mờ: <b style={{ color: "var(--text)" }}>{wmOpacity}%</b></label>
            <input type="range" min={5} max={100} value={wmOpacity} onChange={(e) => setWmOpacity(+e.target.value)} className="w-full accent-[var(--gold)]" />
          </>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button onClick={runPreview} disabled={items.length === 0 || previewing} className="btn-ghost text-[13px] disabled:opacity-40">
            <Eye size={14} /> {previewing ? "Đang tạo…" : "Xem trước"}
          </button>
          {activeQuota && (
            <span className="text-[12px]" style={{ color: outOfQuota ? "#fbbf24" : "var(--text3)" }}>
              {activeQuota.unlimited
                ? "Không giới hạn"
                : isPicker
                ? `Dùng thử Picker: ${activeQuota.used}/${activeQuota.limit}`
                : `Hôm nay: ${activeQuota.used}/${activeQuota.limit} lượt`}
            </span>
          )}
        </div>
      </div>

      {/* Preview panel */}
      {preview && (
        <div className="card p-6 lg:col-span-2">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wide" style={{ color: "var(--text2)" }}>
            <Eye size={15} /> Xem trước — {preview.label}
          </h3>
          <div className="grid items-start gap-4 md:grid-cols-[1fr_auto]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.url} alt="preview" className="max-h-[420px] w-full rounded-lg object-contain" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
            <div className="text-[13px]" style={{ color: "var(--text2)" }}>
              {tool === "convert" ? (
                <p>Kết quả: <b style={{ color: "var(--text)" }}>{formatBytes(preview.newSize)}</b> (.{formatExt(outputFormat)})</p>
              ) : (
                <>
                  <p>Gốc: {formatBytes(preview.origSize)}</p>
                  <p>Sau xử lý: <b style={{ color: "var(--text)" }}>{formatBytes(preview.newSize)}</b></p>
                  {preview.origSize > 0 && preview.newSize < preview.origSize && (
                    <p style={{ color: "var(--gold)" }}>Giảm {Math.round((1 - preview.newSize / preview.origSize) * 100)}%</p>
                  )}
                </>
              )}
              <p className="mt-2 text-[12px]" style={{ color: "var(--text3)" }}>Đây chỉ là ảnh đầu tiên. Đổi tuỳ chọn rồi bấm “Xem trước” lại.</p>
            </div>
          </div>
        </div>
      )}

      {/* Action + results */}
      <div className="card p-6 lg:col-span-2">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button onClick={run} disabled={items.length === 0 || busy || outOfQuota} className="btn-primary disabled:opacity-40">
            <Minimize2 size={15} />
            {busy && progress ? `Đang xử lý… ${progress.done}/${progress.total}` : `${runLabel} ${items.length || ""} ảnh`}
          </button>
          {results.length > 0 && !(tool === "compress" && isPicker) && (
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
          {results.length > 0 && tool !== "convert" && (
            <span className="ml-auto rounded-full px-3 py-1 text-[12.5px]" style={{ background: "color-mix(in srgb, var(--gold) 16%, transparent)", color: "var(--gold)" }}>
              {formatBytes(totalOriginal)} → {formatBytes(totalNew)} · {savedPct >= 0 ? `giảm ${savedPct}%` : `+${-savedPct}%`}
            </span>
          )}
        </div>

        {quotaMsg && (
          <p className="mb-3 rounded-lg px-3 py-2 text-[13px]" style={{ background: "color-mix(in srgb,#f59e0b 14%,transparent)", color: "#fbbf24" }}>{quotaMsg}</p>
        )}
        {writeMsg && <p className="mb-3 text-[13px]" style={{ color: "var(--gold)" }}>{writeMsg}</p>}
        {savingMsg && <p className="mb-3 text-[13px]" style={{ color: "var(--gold)" }}>{savingMsg}</p>}

        {results.length === 0 ? (
          <p className="py-10 text-center text-sm" style={{ color: "var(--text3)" }}>
            {items.length === 0 ? "Chọn nguồn ảnh để bắt đầu." : busy ? "Đang xử lý…" : `Sẵn sàng xử lý ${items.length} ảnh.`}
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}>
            {results.map((r, i) => {
              const pct = r.originalSize > 0 ? Math.round((1 - r.newSize / r.originalSize) * 100) : 0;
              return (
                <div key={r.key} className="flex items-center gap-3 px-4 py-2.5 text-[13px]" style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)", color: "var(--text2)" }}>
                  <span className="min-w-0 flex-1 truncate" title={r.name} style={{ color: "var(--text)" }}>{stripExtension(r.name)}</span>
                  <span className="whitespace-nowrap" style={{ color: "var(--text3)" }}>{formatBytes(r.originalSize)} → {formatBytes(r.newSize)}</span>
                  {tool !== "convert" && (
                    <span className="w-14 whitespace-nowrap text-right" style={{ color: pct > 0 ? "var(--gold)" : "var(--text3)" }}>{pct > 0 ? `−${pct}%` : "—"}</span>
                  )}
                  {!(tool === "compress" && isPicker) && (
                    <button onClick={() => triggerDownload(r.blob, r.out)} className="rounded-md p-1.5" style={{ color: "var(--text2)" }} title="Tải ảnh này">
                      <Download size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
