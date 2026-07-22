// Barrel AN TOÀN CHO CLIENT của @/lib/zalo. Chỉ tái xuất các trình dựng nội dung
// tin nhắn thuần (không server-only) — dùng bởi client components (nút "Gửi cho
// khách"). Logic gửi phía máy chủ nằm ở các module riêng có `import "server-only"`:
//   • @/lib/zalo/send    → sendZalo() (dispatcher chọn kênh + ghi log)
//   • @/lib/zalo/notify  → autoNotify() (gửi theo mốc vòng đời)
//   • @/lib/zalo/config  → load/save + AUTO_EVENTS + publicStatus
//   • @/lib/zalo/oa, @/lib/zalo/personal → transport từng kênh
export * from "./messages";
