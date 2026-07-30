import "server-only";

/**
 * Nhận diện ảnh bằng "magic bytes" thay vì tin vào MIME/đuôi tệp do client gửi.
 * Ngăn việc lưu tệp KHÔNG-phải-ảnh vào bucket công khai rồi phục vụ dưới
 * content-type ảnh (content-type confusion / nhồi payload lạ). Trả về MIME thật
 * suy ra từ header, hoặc null nếu không nhận ra là ảnh.
 */
export function sniffImageType(buf: Buffer): string | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "image/png";

  // GIF: "GIF8"
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";

  // BMP: "BM"
  if (buf[0] === 0x42 && buf[1] === 0x4d) return "image/bmp";

  // TIFF: "II*\0" hoặc "MM\0*"
  if (
    (buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2a && buf[3] === 0x00) ||
    (buf[0] === 0x4d && buf[1] === 0x4d && buf[2] === 0x00 && buf[3] === 0x2a)
  ) return "image/tiff";

  const ascii = (start: number, len: number) => buf.toString("ascii", start, start + len);

  // WebP: "RIFF"...."WEBP"
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";

  // HEIC/HEIF/AVIF: box "ftyp" tại offset 4, brand tại offset 8.
  if (ascii(4, 4) === "ftyp") {
    const brand = ascii(8, 4).toLowerCase();
    if (brand.startsWith("hei") || brand === "mif1" || brand === "msf1") return "image/heic";
    if (brand.startsWith("avif") || brand.startsWith("avis") || brand === "avif") return "image/avif";
  }

  return null;
}
