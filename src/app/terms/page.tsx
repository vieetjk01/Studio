import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Điều khoản dịch vụ — mstudo",
  description: "Điều khoản sử dụng dịch vụ mstudo.com",
};

export default function TermsPage() {
  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 760, margin: "0 auto", padding: "48px 24px", color: "#1a1a1a", lineHeight: 1.7 }}>
      <Link href="/" style={{ fontSize: 14, color: "#3fb98a", textDecoration: "none" }}>← mstudo.com</Link>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginTop: 24, marginBottom: 8 }}>Điều khoản dịch vụ</h1>
      <p style={{ color: "#666", fontSize: 14, marginBottom: 40 }}>Cập nhật lần cuối: tháng 6 năm 2025</p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>1. Chấp nhận điều khoản</h2>
        <p>Bằng cách sử dụng mstudo, bạn đồng ý với các điều khoản này. Nếu không đồng ý, vui lòng không sử dụng dịch vụ.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>2. Mô tả dịch vụ</h2>
        <p>mstudo là nền tảng quản lý studio nhiếp ảnh, cung cấp các tính năng: quản lý hợp đồng, lịch chụp, album ảnh cho khách, báo giá và tích hợp Google Calendar.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>3. Tài khoản người dùng</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>Bạn chịu trách nhiệm bảo mật tài khoản và mật khẩu.</li>
          <li>Không được sử dụng dịch vụ cho mục đích bất hợp pháp.</li>
          <li>Mỗi tài khoản chỉ được sử dụng bởi một cá nhân hoặc studio.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>4. Tích hợp Google Calendar</h2>
        <p>Khi bạn kết nối Google Calendar với mstudo:</p>
        <ul style={{ paddingLeft: 20 }}>
          <li>mstudo sẽ tạo, cập nhật và xoá sự kiện trên Google Calendar của bạn theo thao tác bạn thực hiện trong studio.</li>
          <li>Bạn có thể ngắt kết nối bất kỳ lúc nào.</li>
          <li>mstudo không đọc, sao chép hay lưu trữ dữ liệu sự kiện sẵn có trên Google Calendar của bạn.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>5. Thanh toán và gói dịch vụ</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>Các gói trả phí được thanh toán theo tháng hoặc năm.</li>
          <li>Phí không được hoàn lại sau khi đã kích hoạt gói.</li>
          <li>Chúng tôi có quyền thay đổi giá sau khi thông báo trước 30 ngày.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>6. Giới hạn trách nhiệm</h2>
        <p>mstudo cung cấp dịch vụ &ldquo;như nguyên trạng&rdquo;. Chúng tôi không chịu trách nhiệm về mất mát dữ liệu do sự cố kỹ thuật ngoài tầm kiểm soát. Khuyến nghị bạn sao lưu dữ liệu quan trọng định kỳ.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>7. Chấm dứt dịch vụ</h2>
        <p>Chúng tôi có quyền tạm ngừng hoặc chấm dứt tài khoản vi phạm điều khoản. Bạn có thể yêu cầu xoá tài khoản bất kỳ lúc nào qua email <a href="mailto:support@mstudo.com" style={{ color: "#3fb98a" }}>support@mstudo.com</a>.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>8. Liên hệ</h2>
        <p>Mọi thắc mắc: <a href="mailto:support@mstudo.com" style={{ color: "#3fb98a" }}>support@mstudo.com</a></p>
      </section>
    </div>
  );
}
