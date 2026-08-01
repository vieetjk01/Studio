/* Kiểm thử điều kiện HIỆN hai nút tải ở album giao khách:
 *   - "Tải file chỉnh sửa"  (nguồn stage='delivery')
 *   - "File gốc (ảnh chọn)" (nguồn stage='selection')
 *
 * Gốc lỗi từng làm nút biến mất: `kind` của nguồn do isFolderLink() ĐOÁN từ dạng
 * URL lúc lưu (chỉ khớp ".../folders/…"). Studio dán link chia sẻ dạng khác là
 * nguồn thành "file" → bị lọc bỏ → nút mất, dù link vẫn mở đúng thư mục.
 * Commit 2020f2f đã nới ở album/[slug]/page.tsx nhưng BỎ SÓT access route và
 * getOriginalFolders. Test này chốt cả ba đường đi cùng một quy tắc.
 *
 * pickOriginalLinks nạp thẳng từ src/lib/album-original.ts (code thật). Phép lọc
 * driveFolders nằm inline trong page.tsx / access route nên đọc bằng regex từ
 * chính source — sai lệch giữa hai file sẽ làm test đỏ.
 */
import { readFileSync } from "node:fs";
import { pickOriginalLinks } from "../../src/lib/album-original.ts";
import { isFolderLink } from "../../src/lib/drive.ts";

let fail = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `\n    nhận: ${JSON.stringify(got)}\n    cần : ${JSON.stringify(want)}`}`);
};

// Link thư mục Drive thật mà isFolderLink() KHÔNG nhận ra → kind lưu là "file".
const SHARE_LINK = "https://drive.google.com/open?id=1AbCdEf_folderId";
const FOLDER_LINK = "https://drive.google.com/drive/folders/1AbCdEf_folderId";
check("link /folders/ được nhận là thư mục", isFolderLink(FOLDER_LINK), true);
check("link ?open&id KHÔNG được nhận là thư mục (gốc lỗi)", isFolderLink(SHARE_LINK), false);

// ── Nút "File gốc (ảnh chọn)" ───────────────────────────────────────────────
const names = (list) => list.map((x) => x.name);

check(
  "nguồn selection có link /folders/ → hiện nút",
  names(pickOriginalLinks([{ name: "JPG Goc", drive_url: FOLDER_LINK, kind: "folder", stage: "selection" }])),
  ["JPG Goc"]
);
check(
  "nguồn selection dán link dạng khác VẪN hiện nút (đây là lỗi vừa sửa)",
  names(pickOriginalLinks([{ name: "JPG Goc", drive_url: SHARE_LINK, kind: "file", stage: "selection" }])),
  ["JPG Goc"]
);
check(
  "nguồn CHƯA gắn giai đoạn + kind file → KHÔNG hiện (tránh đẻ nút từ link file lẻ)",
  names(pickOriginalLinks([{ name: "anh1.jpg", drive_url: SHARE_LINK, kind: "file", stage: null }])),
  []
);
check(
  "nguồn CHƯA gắn giai đoạn nhưng là folder → vẫn hiện",
  names(pickOriginalLinks([{ name: "Goc", drive_url: FOLDER_LINK, kind: "folder", stage: null }])),
  ["Goc"]
);
check(
  "nguồn không có link → không hiện",
  names(pickOriginalLinks([{ name: "Goc", drive_url: null, kind: "folder", stage: "selection" }])),
  []
);
check(
  "nguồn thiếu tên → nhãn mặc định 'File gốc'",
  names(pickOriginalLinks([{ name: null, drive_url: SHARE_LINK, kind: "file", stage: "selection" }])),
  ["File gốc"]
);
check(
  "nhiều folder gốc → giữ đủ, đúng thứ tự",
  names(pickOriginalLinks([
    { name: "Goc ngay 1", drive_url: SHARE_LINK, kind: "file", stage: "selection" },
    { name: "Goc ngay 2", drive_url: FOLDER_LINK, kind: "folder", stage: "selection" },
  ])),
  ["Goc ngay 1", "Goc ngay 2"]
);

// ── Nút "Tải file chỉnh sửa": hai đường đi phải cùng một phép lọc ────────────
// Album không mật khẩu đi qua page.tsx; album CÓ mật khẩu đi qua access route.
// Cùng một album phải cho ra cùng số nút, nếu không là lỗi đã từng xảy ra.
const grab = (file) => {
  const src = readFileSync(file, "utf8");
  const m = /\.filter\(\(x\) => ([^\n]*?drive_url[^\n]*?)\)\n\s*\.map\(\(\{ name, drive_url \}\)/.exec(src);
  if (!m) throw new Error(`không tìm thấy phép lọc driveFolders trong ${file}`);
  return m[1].trim();
};
const pageFilter = grab("src/app/album/[slug]/page.tsx");
const accessFilter = grab("src/app/api/album/[slug]/access/route.ts");
check("page.tsx và access route dùng CÙNG phép lọc driveFolders", accessFilter, pageFilter);

// Chạy thử chính biểu thức đó trên dữ liệu thật, cả hai chế độ.
const applyFilter = (expr, rows, useStages) =>
  rows.filter((x) => new Function("x", "useStages", `return ${expr};`)(x, useStages));

const deliverySources = [{ name: "File ChinhSua", drive_url: SHARE_LINK, kind: "file", stage: "delivery" }];
for (const [label, expr] of [["page.tsx", pageFilter], ["access route", accessFilter]]) {
  check(
    `${label}: giai đoạn giao khách nhận link dạng khác → nút hiện`,
    applyFilter(expr, deliverySources, true).length,
    1
  );
  check(
    `${label}: album chưa gắn giai đoạn + link file lẻ → không đẻ nút`,
    applyFilter(expr, [{ name: "a.jpg", drive_url: SHARE_LINK, kind: "file", stage: null }], false).length,
    0
  );
  check(
    `${label}: album chưa gắn giai đoạn nhưng là folder → vẫn hiện`,
    applyFilter(expr, [{ name: "Album", drive_url: FOLDER_LINK, kind: "folder", stage: null }], false).length,
    1
  );
  check(`${label}: nguồn không có link → không hiện`, applyFilter(expr, [{ name: "x", drive_url: null, kind: "folder", stage: "delivery" }], true).length, 0);
}

console.log(fail ? `\n${fail} kiểm thử KHÔNG đạt` : "\nTất cả kiểm thử đạt");
process.exit(fail ? 1 : 0);
