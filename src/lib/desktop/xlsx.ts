import JSZip from "jszip";

/**
 * Trình ghi file .xlsx tối giản dựa trên jszip (XLSX = zip chứa XML) — đủ cho
 * nhu cầu xuất dữ liệu MStudo Desktop: nhiều sheet, chuỗi + số, hàng tiêu đề
 * in đậm, độ rộng cột tự ước lượng. Không cần thêm thư viện ngoài.
 */

export type Cell = string | number | null | undefined;
export type Sheet = { name: string; columns: string[]; rows: Cell[][] };

const escXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Tên sheet Excel: tối đa 31 ký tự, cấm \ / [ ] * ? :
const safeSheetName = (s: string, i: number) =>
  ((s || `Sheet${i + 1}`).replace(/[\\/\[\]*?:]/g, " ").trim() || `Sheet${i + 1}`).slice(0, 31);

function colRef(n: number) {
  let s = ""; n += 1;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function sheetXml(sheet: Sheet): string {
  const all: Cell[][] = [sheet.columns, ...sheet.rows];
  const rowsXml = all
    .map((row, r) => {
      const cells = row
        .map((v, ci) => {
          if (v == null || v === "") return "";
          const ref = colRef(ci) + (r + 1);
          const style = r === 0 ? ' s="1"' : "";
          if (typeof v === "number" && isFinite(v)) return `<c r="${ref}"${style}><v>${v}</v></c>`;
          return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${escXml(String(v))}</t></is></c>`;
        })
        .join("");
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join("");
  // Độ rộng cột: ước theo nội dung (xem tối đa 200 hàng đầu), kẹp 10..50.
  const widths = sheet.columns.map((c, i) => {
    let m = String(c ?? "").length;
    for (const row of sheet.rows.slice(0, 200)) {
      const v = row[i];
      if (v != null) m = Math.max(m, String(v).length);
    }
    return Math.min(50, Math.max(10, m + 2));
  });
  const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    (cols ? `<cols>${cols}</cols>` : "") +
    `<sheetData>${rowsXml}</sheetData></worksheet>`
  );
}

export async function buildXlsx(sheets: Sheet[]): Promise<Uint8Array> {
  const zip = new JSZip();
  const names = sheets.map((s, i) => safeSheetName(s.name, i));

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
      sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
      `</Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
      `</Relationships>`
  );
  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` +
      names.map((n, i) => `<sheet name="${escXml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") +
      `</sheets></workbook>`
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
      `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      `</Relationships>`
  );
  zip.file(
    "xl/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
      `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
      `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
      `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
      `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
      `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>` +
      `</styleSheet>`
  );
  sheets.forEach((s, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)));
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
