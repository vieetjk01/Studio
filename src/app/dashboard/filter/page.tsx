"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Link2,
  ListChecks,
  ClipboardPaste,
  Copy,
  Download,
  FileText,
  Check,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { thumbnailUrl, stripExtension } from "@/lib/drive";
import { buildZip, triggerDownload } from "@/lib/download";

interface DriveFile {
  id: string;
  name: string;
}

const norm = (s: string) => stripExtension(s).trim().toLowerCase();

export default function FilterPage() {
  const supabase = createClient();

  const [driveUrl, setDriveUrl] = useState("");
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);

  const [mode, setMode] = useState<"paste" | "album">("paste");
  const [pasteText, setPasteText] = useState("");

  const [albums, setAlbums] = useState<{ id: string; title: string }[]>([]);
  const [albumId, setAlbumId] = useState("");
  const [albumNames, setAlbumNames] = useState<string[]>([]);

  const [copied, setCopied] = useState(false);
  const [zipProgress, setZipProgress] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("albums")
      .select("id, title")
      .order("updated_at", { ascending: false })
      .then(({ data }) => setAlbums(data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDrive() {
    setLoadingDrive(true);
    setDriveError(null);
    const res = await fetch("/api/drive/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: driveUrl }),
    });
    const data = await res.json();
    setLoadingDrive(false);
    if (data.error) {
      setDriveError(data.error);
      setDriveFiles([]);
      return;
    }
    setDriveFiles(data.files ?? []);
  }

  async function loadAlbum(id: string) {
    setAlbumId(id);
    if (!id) {
      setAlbumNames([]);
      return;
    }
    const { data } = await supabase
      .from("selections")
      .select("photo_name")
      .eq("album_id", id);
    const names = [...new Set((data ?? []).map((r) => r.photo_name).filter(Boolean))];
    setAlbumNames(names);
  }

  // The list of names to match against the Drive folder.
  const wantedNames = useMemo(
    () =>
      mode === "paste"
        ? pasteText.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean)
        : albumNames,
    [mode, pasteText, albumNames]
  );
  const wantedSet = useMemo(() => new Set(wantedNames.map(norm)), [wantedNames]);

  const matched = useMemo(
    () => driveFiles.filter((f) => wantedSet.has(norm(f.name))),
    [driveFiles, wantedSet]
  );
  const matchedNorm = useMemo(() => new Set(matched.map((f) => norm(f.name))), [matched]);
  const notFound = useMemo(
    () => wantedNames.filter((n) => !matchedNorm.has(norm(n))),
    [wantedNames, matchedNorm]
  );

  function copyMatched() {
    navigator.clipboard.writeText(matched.map((f) => stripExtension(f.name)).join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  function exportMatched() {
    triggerDownload(
      new Blob([matched.map((f) => stripExtension(f.name)).join("\n")], {
        type: "text/plain;charset=utf-8",
      }),
      "loc-anh.txt"
    );
  }
  async function zipMatched() {
    if (matched.length === 0) return;
    setZipProgress(0);
    const blob = await buildZip(
      matched.map((f) => ({ fileId: f.id, name: f.name })),
      { watermark: null, onProgress: (d, tot) => setZipProgress(Math.round((d / tot) * 100)) }
    );
    triggerDownload(blob, "loc-anh.zip");
    setZipProgress(null);
  }

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-8">
        <p className="eyebrow mb-1.5">Công cụ</p>
        <h1 className="font-serif text-[clamp(28px,4vw,44px)] font-medium leading-none">Lọc ảnh</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed" style={{ color: "var(--text2)" }}>
          Dán thư mục Google Drive, rồi đối chiếu với danh sách ảnh khách đã chọn (hoặc danh sách bạn tự nhập) để lọc & tải đúng những ảnh cần.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Drive source */}
        <div className="card p-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wide" style={{ color: "var(--text2)" }}>
            <Link2 size={15} /> Thư mục Drive
          </h2>
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
          {driveFiles.length > 0 && (
            <p className="mt-3 text-[13px]" style={{ color: "var(--text2)" }}>
              Đã tải <b>{driveFiles.length}</b> ảnh từ Drive.
            </p>
          )}
        </div>

        {/* Name list source */}
        <div className="card p-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wide" style={{ color: "var(--text2)" }}>
            <ListChecks size={15} /> Danh sách cần lọc
          </h2>
          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setMode("paste")}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px]"
              style={mode === "paste" ? { background: "var(--accent)", color: "var(--accentInk)" } : { background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}
            >
              <ClipboardPaste size={14} /> Tự nhập
            </button>
            <button
              onClick={() => setMode("album")}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px]"
              style={mode === "album" ? { background: "var(--accent)", color: "var(--accentInk)" } : { background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}
            >
              <ListChecks size={14} /> Từ lựa chọn khách
            </button>
          </div>

          {mode === "paste" ? (
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={"Mỗi dòng một tên ảnh, ví dụ:\nIMG_001\nIMG_045\n(không cần đuôi .jpg)"}
              className="input min-h-[160px] resize-y"
            />
          ) : (
            <>
              <select className="input" value={albumId} onChange={(e) => loadAlbum(e.target.value)}>
                <option value="">— Chọn album —</option>
                {albums.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
              <p className="mt-3 text-[13px]" style={{ color: "var(--text2)" }}>
                {albumId ? `Khách đã chọn ${albumNames.length} ảnh.` : "Chọn album để lấy danh sách ảnh khách đã chọn."}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="mt-6 card p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="font-serif text-2xl font-medium">
            Kết quả lọc: {matched.length} ảnh
          </h2>
          {notFound.length > 0 && (
            <span className="rounded-full px-2.5 py-1 text-[12px]" style={{ background: "color-mix(in srgb,#f59e0b 16%,transparent)", color: "#fbbf24" }}>
              {notFound.length} tên không tìm thấy trên Drive
            </span>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            <button onClick={copyMatched} disabled={matched.length === 0} className="btn-ghost text-[13px] disabled:opacity-40">
              {copied ? <Check size={14} /> : <Copy size={14} />} Copy (không đuôi)
            </button>
            <button onClick={exportMatched} disabled={matched.length === 0} className="btn-ghost text-[13px] disabled:opacity-40">
              <FileText size={14} /> Xuất .txt
            </button>
            <button onClick={zipMatched} disabled={matched.length === 0 || zipProgress !== null} className="btn-primary text-[13px] disabled:opacity-40">
              <Download size={14} /> {zipProgress !== null ? `${zipProgress}%` : "Tải ZIP"}
            </button>
          </div>
        </div>

        {matched.length === 0 ? (
          <p className="py-10 text-center text-sm" style={{ color: "var(--text3)" }}>
            {driveFiles.length === 0
              ? "Tải ảnh từ Drive và nhập danh sách để bắt đầu lọc."
              : "Chưa có ảnh nào khớp danh sách."}
          </p>
        ) : (
          <div className="grid items-start gap-3 [grid-template-columns:repeat(auto-fill,minmax(130px,1fr))]">
            {matched.map((f) => (
              <div key={f.id} className="overflow-hidden rounded-lg" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <div className="aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbnailUrl(f.id, 400)} alt={f.name} loading="lazy" className="h-full w-full object-cover" />
                </div>
                <p className="truncate px-2 py-1.5 text-[11px]" style={{ color: "var(--text2)" }} title={f.name}>
                  {stripExtension(f.name)}
                </p>
              </div>
            ))}
          </div>
        )}

        {notFound.length > 0 && (
          <div className="mt-5 rounded-xl p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <p className="mb-2 text-[13px] font-medium" style={{ color: "#fbbf24" }}>
              Không tìm thấy trên Drive ({notFound.length}):
            </p>
            <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--text2)" }}>
              {notFound.join(", ")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
