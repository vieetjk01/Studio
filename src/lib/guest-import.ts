/**
 * Đọc DANH SÁCH TÊN KHÁCH từ file khách hàng gửi lên (chạy ở trình duyệt).
 * Hỗ trợ:
 *   - .csv / .txt : mỗi dòng một tên (lấy cột đầu nếu có nhiều cột).
 *   - .xlsx       : lấy cột A của sheet đầu (Excel = zip chứa XML → dùng jszip).
 * Tự bỏ dòng tiêu đề phổ biến ("Tên", "Name", "STT"…).
 */

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");

const HEADER = /^(st[t]?|no|tt|tên|ten|họ tên|ho ten|họ và tên|ho va ten|name|full ?name|khách|khach|guest|guests|khách mời|khach moi)$/i;

function stripHeader(names: string[]): string[] {
  return names.length && HEADER.test(names[0].trim()) ? names.slice(1) : names;
}

/** CSV/TXT: mỗi dòng một tên; nếu có dấu phẩy/tab thì lấy trường đầu. */
function parseText(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const first = line.split(/[,;\t]/)[0]?.trim().replace(/^"(.*)"$/, "$1").trim();
    if (first) out.push(first.slice(0, 80));
  }
  return stripHeader(out);
}

/** .xlsx: lấy giá trị cột A của worksheet đầu tiên. */
async function parseXlsx(file: File): Promise<string[]> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);

  // Bảng chuỗi dùng chung.
  const ssXml = (await zip.file("xl/sharedStrings.xml")?.async("string")) ?? "";
  const shared: string[] = [];
  for (const si of ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    const parts = [...si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]);
    shared.push(decode(parts.join("")));
  }

  // Sheet đầu tiên.
  let path = "xl/worksheets/sheet1.xml";
  if (!zip.file(path)) {
    const found = Object.keys(zip.files).find((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k));
    if (found) path = found;
  }
  const shXml = (await zip.file(path)?.async("string")) ?? "";

  const names: string[] = [];
  for (const cm of shXml.matchAll(/<c\s+[^>]*r="A\d+"[^>]*?(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const tag = cm[0], inner = cm[1] ?? "";
    const t = /t="([^"]+)"/.exec(tag)?.[1];
    let val = "";
    if (t === "s") {
      const vi = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
      if (vi != null) val = shared[Number(vi)] ?? "";
    } else if (t === "inlineStr") {
      val = decode([...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(""));
    } else {
      val = decode(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? "");
    }
    const s = val.trim();
    if (s) names.push(s.slice(0, 80));
  }
  return stripHeader(names);
}

/** Đọc tên khách từ file theo phần mở rộng. Trả về mảng tên (đã cắt gọn). */
export async function parseGuestFile(file: File): Promise<string[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) return parseXlsx(file);
  // .csv, .txt, hoặc bất kỳ file văn bản nào khác.
  return parseText(await file.text());
}
