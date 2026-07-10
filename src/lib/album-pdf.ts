/**
 * Bộ ghi PDF tối giản cho album in — KHÔNG cần thư viện ngoài.
 *
 * Mỗi trang = một ảnh JPEG phủ kín khổ (nhúng thẳng bằng bộ lọc DCTDecode, không
 * giải nén/mã hoá lại → giữ nguyên chất lượng), tuỳ chọn vẽ DẤU CẮT (crop marks)
 * ở bốn góc theo mép trim để nhà in canh xén. Dùng cho xuất album chuẩn in
 * (đúng khổ + bleed). Chạy hoàn toàn ở trình duyệt.
 */

export type PdfPageSpec = {
  jpeg: Uint8Array; // byte JPEG (RGB/JFIF từ canvas)
  widthPx: number;
  heightPx: number;
  boxWpt: number; // MediaBox rộng — điểm PDF (72/inch), ĐÃ gồm bleed
  boxHpt: number; // MediaBox cao — điểm PDF, đã gồm bleed
  trimMarginPt?: number; // độ dày bleed (điểm); >0 thì vẽ dấu cắt tại mép trim
};

/** Chuỗi ASCII → byte (giữ nguyên từng byte, dùng cho phần văn bản của PDF). */
function enc(s: string): Uint8Array {
  const a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 0xff;
  return a;
}

function pad10(n: number): string {
  return String(Math.floor(n)).padStart(10, "0");
}

/** Dựng content stream: vẽ ảnh phủ khổ + (tuỳ chọn) dấu cắt tại mép trim. */
function contentStream(W: number, H: number, margin: number): string {
  // Ảnh phủ toàn MediaBox: ma trận cm ánh xạ ô đơn vị [0,1] ra kích thước trang.
  let cs = `q ${W.toFixed(2)} 0 0 ${H.toFixed(2)} 0 0 cm /Im0 Do Q\n`;
  if (margin > 0) {
    const g = margin; // mép trim cách mép giấy đúng bằng bleed
    cs += "0 0 0 RG 0.5 w\n";
    const seg = (x1: number, y1: number, x2: number, y2: number) =>
      `${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`;
    // Bốn góc trim (gốc toạ độ PDF ở góc dưới-trái). Dấu cắt nằm trong vùng bleed.
    // Dưới-trái
    cs += seg(0, g, g, g) + seg(g, 0, g, g);
    // Dưới-phải
    cs += seg(W - g, g, W, g) + seg(W - g, 0, W - g, g);
    // Trên-trái
    cs += seg(0, H - g, g, H - g) + seg(g, H - g, g, H);
    // Trên-phải
    cs += seg(W - g, H - g, W, H - g) + seg(W - g, H - g, W - g, H);
  }
  return cs;
}

/** Ghép các trang thành một Blob PDF (application/pdf). */
export function buildPdf(pages: PdfPageSpec[]): Blob {
  const chunks: Uint8Array[] = [];
  let offset = 0;
  const offsets: number[] = [];
  const push = (u: Uint8Array) => {
    chunks.push(u);
    offset += u.length;
  };
  const pushStr = (s: string) => push(enc(s));

  pushStr("%PDF-1.4\n%ÿÿÿÿ\n");

  const nPages = pages.length;
  // 1=Catalog, 2=Pages; mỗi trang chiếm 3 object (page, content, image).
  const pageObjIds: number[] = [];
  let nextId = 3;
  for (let i = 0; i < nPages; i++) {
    pageObjIds.push(nextId);
    nextId += 3;
  }
  const totalObjs = 2 + nPages * 3;

  const startObj = (id: number) => {
    offsets[id] = offset;
    pushStr(`${id} 0 obj\n`);
  };
  const endObj = () => pushStr("endobj\n");

  // 1 — Catalog
  startObj(1);
  pushStr("<< /Type /Catalog /Pages 2 0 R >>\n");
  endObj();

  // 2 — Pages
  const kids = pageObjIds.map((id) => `${id} 0 R`).join(" ");
  startObj(2);
  pushStr(`<< /Type /Pages /Kids [ ${kids} ] /Count ${nPages} >>\n`);
  endObj();

  pages.forEach((pg, i) => {
    const pageId = pageObjIds[i];
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    const cs = contentStream(pg.boxWpt, pg.boxHpt, pg.trimMarginPt ?? 0);
    const csBytes = enc(cs);

    // Page
    startObj(pageId);
    pushStr(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pg.boxWpt.toFixed(2)} ${pg.boxHpt.toFixed(
        2,
      )}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\n`,
    );
    endObj();

    // Content
    startObj(contentId);
    pushStr(`<< /Length ${csBytes.length} >>\nstream\n`);
    push(csBytes);
    pushStr("\nendstream\n");
    endObj();

    // Image (JPEG nhúng nguyên bản)
    startObj(imageId);
    pushStr(
      `<< /Type /XObject /Subtype /Image /Width ${pg.widthPx} /Height ${pg.heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.jpeg.length} >>\nstream\n`,
    );
    push(pg.jpeg);
    pushStr("\nendstream\n");
    endObj();
  });

  // xref
  const xrefStart = offset;
  pushStr(`xref\n0 ${totalObjs + 1}\n`);
  pushStr("0000000000 65535 f \n");
  for (let id = 1; id <= totalObjs; id++) {
    pushStr(`${pad10(offsets[id] ?? 0)} 00000 n \n`);
  }
  pushStr(`trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}

/** cm → điểm PDF (1 inch = 72 điểm = 2.54 cm). */
export const cmToPt = (cm: number) => (cm / 2.54) * 72;
