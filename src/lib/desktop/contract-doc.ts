import JSZip from "jszip";

/**
 * Sinh file hợp đồng cho MStudo Desktop:
 *  - HTML tự chứa (kiểu văn bản in A4) — client Windows chuyển thành PDF, bản
 *    PDF giữ nguyên ẢNH CHỮ KÝ của hai bên;
 *  - DOCX (Word) tối giản qua jszip — bản soạn thảo lại được, chữ ký thể hiện
 *    bằng dòng "Đã ký điện tử".
 */

export type ContractDocData = {
  studio: {
    name: string;
    phone?: string | null;
    email?: string | null;
    bankHolder?: string | null;
    bankAccount?: string | null;
    bankName?: string | null;
  };
  contract: {
    code?: string | null;
    title?: string | null;
    client_name?: string | null;
    client_phone?: string | null;
    client_email?: string | null;
    shoot_type?: string | null;
    event_date?: string | null;
    event_time?: string | null;
    location?: string | null;
    deposit?: number | null;
    note?: string | null;
    client_signed_name?: string | null;
    client_signature?: string | null;
    client_signed_at?: string | null;
    studio_signed_name?: string | null;
    studio_signature?: string | null;
    studio_signed_at?: string | null;
    created_at?: string | null;
  };
  items: { name: string; qty: number; unit_price: number }[];
  payments: { amount: number; kind?: string | null; paid_at?: string | null; note?: string | null }[];
};

const SHOOT_TYPES: Record<string, string> = {
  photo: "Chụp ảnh", video: "Quay phim", both: "Chụp ảnh & quay phim", psc: "Phóng sự cưới",
  makeup: "Trang điểm", rental: "Thuê trang phục", prewedding: "Chụp ảnh cưới (pre-wedding)",
  wedding: "Ngày cưới", other: "Dịch vụ khác",
};
const PAY_KINDS: Record<string, string> = { deposit: "Đặt cọc", installment: "Thanh toán đợt", final: "Tất toán", other: "Khác" };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const vnd = (n: number | null | undefined) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";
const dmy = (s?: string | null) => {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

/** Tên file/thư mục hợp lệ Windows (giữ tiếng Việt, bỏ ký tự cấm). */
export function safeFileName(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim().slice(0, 150);
}

/**
 * Bản ASCII của tên file — dùng cho phần `filename=` trong HTTP header
 * Content-Disposition (header chỉ nhận Latin-1; ký tự tiếng Việt >255 sẽ ném
 * lỗi ByteString). Tên có dấu vẫn được giữ ở `filename*=UTF-8''`.
 */
export function asciiName(s: string): string {
  return s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/"/g, "");
}

// Đúng định dạng đã chốt: "Hợp đồng {mã HĐ} - {Tên khách} - {SĐT}".
export function contractBaseName(c: ContractDocData["contract"]): string {
  const head = "Hop dong" + (c.code ? ` ${c.code}` : "");
  const parts = [head, c.client_name || "", c.client_phone || ""].filter(Boolean);
  return safeFileName(parts.join(" - "));
}

function computeTotals(d: ContractDocData) {
  const total = d.items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unit_price) || 0), 0);
  const paid = d.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  return { total, paid, remain: Math.max(0, total - paid) };
}

// ─── HTML (client in ra PDF) ──────────────────────────────────────────────────

export function buildContractHtml(d: ContractDocData): string {
  const c = d.contract;
  const { total, paid, remain } = computeTotals(d);
  const itemsRows = d.items
    .map((it, i) => `<tr><td class="c">${i + 1}</td><td>${esc(it.name || "")}</td><td class="c">${it.qty}</td><td class="r">${vnd(it.unit_price)}</td><td class="r">${vnd((it.qty || 0) * (it.unit_price || 0))}</td></tr>`)
    .join("");
  const payRows = d.payments
    .map((p) => `<tr><td>${dmy(p.paid_at)}</td><td>${esc(PAY_KINDS[p.kind || ""] || p.kind || "")}</td><td class="r">${vnd(p.amount)}</td><td>${esc(p.note || "")}</td></tr>`)
    .join("");
  const sig = (img?: string | null, name?: string | null, at?: string | null, label = "") => `
    <div class="sig">
      <div class="sig-label">${esc(label)}</div>
      ${img && /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=\s]+$/.test(img) ? `<img src="${esc(img)}" alt="chữ ký" />` : `<div class="sig-space"></div>`}
      <div class="sig-name">${esc(name || "")}</div>
      ${at ? `<div class="sig-at">Đã ký ngày ${dmy(at)}</div>` : ""}
    </div>`;

  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8" />
<title>${esc(contractBaseName(c))}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Times New Roman", Times, serif; color: #111; font-size: 13pt; line-height: 1.55; margin: 0; }
  .nat { text-align: center; font-weight: bold; }
  .nat small { display: block; font-weight: bold; }
  .rule { width: 180px; border-bottom: 1.5px solid #111; margin: 4px auto 18px; }
  h1 { text-align: center; font-size: 17pt; margin: 18px 0 2px; text-transform: uppercase; }
  .code { text-align: center; margin: 0 0 18px; font-style: italic; }
  h2 { font-size: 13.5pt; margin: 18px 0 6px; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; }
  th, td { border: 1px solid #555; padding: 5px 8px; font-size: 12pt; vertical-align: top; }
  th { background: #f0f0f0; text-align: center; }
  td.c { text-align: center; } td.r { text-align: right; white-space: nowrap; }
  .totals { margin: 4px 0 0; width: auto; margin-left: auto; }
  .totals td { border: none; padding: 2px 8px; }
  .totals .lbl { text-align: right; } .totals .val { text-align: right; min-width: 130px; font-weight: bold; }
  .sigs { display: flex; justify-content: space-between; margin-top: 34px; page-break-inside: avoid; }
  .sig { width: 46%; text-align: center; }
  .sig-label { font-weight: bold; }
  .sig img { max-height: 90px; max-width: 100%; margin: 8px auto 2px; display: block; }
  .sig-space { height: 90px; }
  .sig-name { font-weight: bold; margin-top: 2px; }
  .sig-at { font-size: 11pt; font-style: italic; }
  .meta { font-size: 10.5pt; color: #666; text-align: right; margin-top: 26px; }
  p { margin: 3px 0; }
</style></head><body>
  <div class="nat">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<small>Độc lập – Tự do – Hạnh phúc</small></div>
  <div class="rule"></div>
  <h1>${esc(c.title || "Hợp đồng dịch vụ")}</h1>
  <p class="code">Số: ${esc(c.code || "")}${c.created_at ? ` · Ngày lập: ${dmy(c.created_at)}` : ""}</p>

  <h2>Bên A (Bên cung cấp dịch vụ)</h2>
  <p><b>${esc(d.studio.name)}</b></p>
  ${d.studio.phone ? `<p>Điện thoại: ${esc(d.studio.phone)}</p>` : ""}
  ${d.studio.email ? `<p>Email: ${esc(d.studio.email)}</p>` : ""}
  ${d.studio.bankAccount ? `<p>Tài khoản: ${esc(d.studio.bankAccount)}${d.studio.bankName ? ` · ${esc(d.studio.bankName)}` : ""}${d.studio.bankHolder ? ` · ${esc(d.studio.bankHolder)}` : ""}</p>` : ""}

  <h2>Bên B (Khách hàng)</h2>
  <p><b>${esc(c.client_name || "")}</b></p>
  ${c.client_phone ? `<p>Điện thoại: ${esc(c.client_phone)}</p>` : ""}
  ${c.client_email ? `<p>Email: ${esc(c.client_email)}</p>` : ""}

  <h2>Nội dung dịch vụ</h2>
  <p>Loại dịch vụ: <b>${esc(SHOOT_TYPES[c.shoot_type || ""] || c.shoot_type || "")}</b></p>
  ${c.event_date ? `<p>Thời gian: <b>${dmy(c.event_date)}${c.event_time ? ` · ${esc(c.event_time)}` : ""}</b></p>` : ""}
  ${c.location ? `<p>Địa điểm: ${esc(c.location)}</p>` : ""}

  ${d.items.length ? `<h2>Hạng mục &amp; chi phí</h2>
  <table><thead><tr><th style="width:36px">STT</th><th>Hạng mục</th><th style="width:52px">SL</th><th style="width:110px">Đơn giá</th><th style="width:120px">Thành tiền</th></tr></thead>
  <tbody>${itemsRows}</tbody></table>` : ""}
  <table class="totals">
    <tr><td class="lbl">Tổng giá trị hợp đồng:</td><td class="val">${vnd(total)}</td></tr>
    ${c.deposit ? `<tr><td class="lbl">Tiền cọc:</td><td class="val">${vnd(c.deposit)}</td></tr>` : ""}
    <tr><td class="lbl">Đã thanh toán:</td><td class="val">${vnd(paid)}</td></tr>
    <tr><td class="lbl">Còn lại:</td><td class="val">${vnd(remain)}</td></tr>
  </table>

  ${d.payments.length ? `<h2>Các khoản đã thanh toán</h2>
  <table><thead><tr><th style="width:110px">Ngày</th><th style="width:140px">Loại</th><th style="width:130px">Số tiền</th><th>Ghi chú</th></tr></thead>
  <tbody>${payRows}</tbody></table>` : ""}

  ${c.note ? `<h2>Ghi chú</h2><p>${esc(c.note).replace(/\n/g, "<br/>")}</p>` : ""}

  <div class="sigs">
    ${sig(c.studio_signature, c.studio_signed_name || d.studio.name, c.studio_signed_at, "ĐẠI DIỆN BÊN A")}
    ${sig(c.client_signature, c.client_signed_name || c.client_name, c.client_signed_at, "ĐẠI DIỆN BÊN B")}
  </div>
  <div class="meta">Xuất từ mstudo ngày ${dmy(new Date().toISOString())}</div>
</body></html>`;
}

// ─── DOCX (Word — bản soạn thảo) ─────────────────────────────────────────────

type ParaOpts = { bold?: boolean; italic?: boolean; size?: number; align?: "center" | "right" | "both"; caps?: boolean };

function wPara(text: string, o: ParaOpts = {}): string {
  const sz = (o.size ?? 13) * 2; // half-points
  const rPr = `<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>${o.bold ? "<w:b/>" : ""}${o.italic ? "<w:i/>" : ""}${o.caps ? "<w:caps/>" : ""}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr>`;
  const pPr = `<w:pPr>${o.align ? `<w:jc w:val="${o.align}"/>` : ""}</w:pPr>`;
  const lines = String(text ?? "").split("\n");
  const runs = lines
    .map((l, i) => `<w:r>${rPr}${i > 0 ? "<w:br/>" : ""}<w:t xml:space="preserve">${esc(l)}</w:t></w:r>`)
    .join("");
  return `<w:p>${pPr}${runs}</w:p>`;
}

function wCell(text: string, o: ParaOpts & { width?: number } = {}): string {
  return `<w:tc><w:tcPr>${o.width ? `<w:tcW w:w="${o.width}" w:type="dxa"/>` : ""}</w:tcPr>${wPara(text, { size: 12, ...o })}</w:tc>`;
}

function wTable(rows: string[]): string {
  const borders = ["top", "left", "bottom", "right", "insideH", "insideV"]
    .map((b) => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="666666"/>`)
    .join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${borders}</w:tblBorders></w:tblPr>${rows.join("")}</w:tbl>`;
}

export async function buildContractDocx(d: ContractDocData): Promise<Uint8Array> {
  const c = d.contract;
  const { total, paid, remain } = computeTotals(d);
  const body: string[] = [];
  body.push(wPara("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", { bold: true, align: "center" }));
  body.push(wPara("Độc lập – Tự do – Hạnh phúc", { bold: true, align: "center" }));
  body.push(wPara("――――――――――", { align: "center" }));
  body.push(wPara(c.title || "Hợp đồng dịch vụ", { bold: true, size: 16, align: "center", caps: true }));
  body.push(wPara(`Số: ${c.code || ""}${c.created_at ? ` · Ngày lập: ${dmy(c.created_at)}` : ""}`, { italic: true, align: "center" }));
  body.push(wPara(""));
  body.push(wPara("BÊN A (BÊN CUNG CẤP DỊCH VỤ)", { bold: true }));
  body.push(wPara(d.studio.name, { bold: true }));
  if (d.studio.phone) body.push(wPara(`Điện thoại: ${d.studio.phone}`));
  if (d.studio.email) body.push(wPara(`Email: ${d.studio.email}`));
  if (d.studio.bankAccount) body.push(wPara(`Tài khoản: ${d.studio.bankAccount}${d.studio.bankName ? ` · ${d.studio.bankName}` : ""}${d.studio.bankHolder ? ` · ${d.studio.bankHolder}` : ""}`));
  body.push(wPara(""));
  body.push(wPara("BÊN B (KHÁCH HÀNG)", { bold: true }));
  body.push(wPara(c.client_name || "", { bold: true }));
  if (c.client_phone) body.push(wPara(`Điện thoại: ${c.client_phone}`));
  if (c.client_email) body.push(wPara(`Email: ${c.client_email}`));
  body.push(wPara(""));
  body.push(wPara("NỘI DUNG DỊCH VỤ", { bold: true }));
  body.push(wPara(`Loại dịch vụ: ${SHOOT_TYPES[c.shoot_type || ""] || c.shoot_type || ""}`));
  if (c.event_date) body.push(wPara(`Thời gian: ${dmy(c.event_date)}${c.event_time ? ` · ${c.event_time}` : ""}`));
  if (c.location) body.push(wPara(`Địa điểm: ${c.location}`));
  if (d.items.length) {
    body.push(wPara(""));
    body.push(wPara("HẠNG MỤC & CHI PHÍ", { bold: true }));
    const header = `<w:tr>${wCell("STT", { bold: true, align: "center", width: 700 })}${wCell("Hạng mục", { bold: true, align: "center", width: 4200 })}${wCell("SL", { bold: true, align: "center", width: 700 })}${wCell("Đơn giá", { bold: true, align: "center", width: 1700 })}${wCell("Thành tiền", { bold: true, align: "center", width: 1800 })}</w:tr>`;
    const rows = d.items.map((it, i) =>
      `<w:tr>${wCell(String(i + 1), { align: "center" })}${wCell(it.name || "")}${wCell(String(it.qty), { align: "center" })}${wCell(vnd(it.unit_price), { align: "right" })}${wCell(vnd((it.qty || 0) * (it.unit_price || 0)), { align: "right" })}</w:tr>`
    );
    body.push(wTable([header, ...rows]));
  }
  body.push(wPara(""));
  body.push(wPara(`Tổng giá trị hợp đồng: ${vnd(total)}`, { bold: true, align: "right" }));
  if (c.deposit) body.push(wPara(`Tiền cọc: ${vnd(c.deposit)}`, { align: "right" }));
  body.push(wPara(`Đã thanh toán: ${vnd(paid)} · Còn lại: ${vnd(remain)}`, { align: "right" }));
  if (d.payments.length) {
    body.push(wPara(""));
    body.push(wPara("CÁC KHOẢN ĐÃ THANH TOÁN", { bold: true }));
    const header = `<w:tr>${wCell("Ngày", { bold: true, align: "center", width: 1500 })}${wCell("Loại", { bold: true, align: "center", width: 2000 })}${wCell("Số tiền", { bold: true, align: "center", width: 1800 })}${wCell("Ghi chú", { bold: true, align: "center", width: 3800 })}</w:tr>`;
    const rows = d.payments.map((p) =>
      `<w:tr>${wCell(dmy(p.paid_at))}${wCell(PAY_KINDS[p.kind || ""] || p.kind || "")}${wCell(vnd(p.amount), { align: "right" })}${wCell(p.note || "")}</w:tr>`
    );
    body.push(wTable([header, ...rows]));
  }
  if (c.note) {
    body.push(wPara(""));
    body.push(wPara("GHI CHÚ", { bold: true }));
    body.push(wPara(c.note));
  }
  body.push(wPara(""));
  body.push(wPara(""));
  const signTable = `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr><w:tr>` +
    `<w:tc><w:tcPr><w:tcW w:w="4600" w:type="dxa"/></w:tcPr>` +
    wPara("ĐẠI DIỆN BÊN A", { bold: true, align: "center" }) +
    wPara(c.studio_signed_name || d.studio.name, { bold: true, align: "center" }) +
    wPara(c.studio_signed_at ? `Đã ký điện tử ngày ${dmy(c.studio_signed_at)}` : "(Ký, ghi rõ họ tên)", { italic: true, size: 11, align: "center" }) +
    `</w:tc>` +
    `<w:tc><w:tcPr><w:tcW w:w="4600" w:type="dxa"/></w:tcPr>` +
    wPara("ĐẠI DIỆN BÊN B", { bold: true, align: "center" }) +
    wPara(c.client_signed_name || c.client_name || "", { bold: true, align: "center" }) +
    wPara(c.client_signed_at ? `Đã ký điện tử ngày ${dmy(c.client_signed_at)}` : "(Ký, ghi rõ họ tên)", { italic: true, size: 11, align: "center" }) +
    `</w:tc></w:tr></w:tbl>`;
  body.push(signTable);

  const documentXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>` +
    body.join("") +
    `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>` +
    `</w:body></w:document>`;

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `</Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
      `</Relationships>`
  );
  zip.file("word/document.xml", documentXml);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
