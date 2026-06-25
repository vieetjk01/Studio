import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Chính sách bảo mật — mstudo",
  description: "Chính sách bảo mật của mstudo.com",
};

export default function PrivacyPage() {
  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 760, margin: "0 auto", padding: "48px 24px", color: "#1a1a1a", lineHeight: 1.7 }}>
      <Link href="/" style={{ fontSize: 14, color: "#3fb98a", textDecoration: "none" }}>← mstudo.com</Link>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginTop: 24, marginBottom: 8 }}>Chính sách bảo mật</h1>
      <p style={{ color: "#666", fontSize: 14, marginBottom: 40 }}>Cập nhật lần cuối: tháng 6 năm 2025</p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>1. Giới thiệu</h2>
        <p>mstudo (&ldquo;chúng tôi&rdquo;) cung cấp nền tảng quản lý studio nhiếp ảnh tại <strong>mstudo.com</strong> và <strong>album.mstudo.com</strong>. Chính sách này mô tả cách chúng tôi thu thập, sử dụng và bảo vệ thông tin của bạn.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>2. Thông tin chúng tôi thu thập</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>Thông tin tài khoản:</strong> email, tên khi bạn đăng ký.</li>
          <li><strong>Dữ liệu studio:</strong> hợp đồng, lịch chụp, album ảnh, thông tin khách hàng bạn nhập vào hệ thống.</li>
          <li><strong>Google Calendar:</strong> nếu bạn kết nối Google Calendar, chúng tôi lưu trữ refresh token để đồng bộ sự kiện. Chúng tôi chỉ tạo, cập nhật và xoá sự kiện do bạn tạo trong mstudo — không đọc dữ liệu khác từ Google Calendar của bạn.</li>
          <li><strong>Dữ liệu sử dụng:</strong> logs truy cập cơ bản để vận hành dịch vụ.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>3. Cách chúng tôi sử dụng thông tin</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>Cung cấp và vận hành các tính năng của mstudo.</li>
          <li>Đồng bộ lịch chụp lên Google Calendar theo yêu cầu của bạn.</li>
          <li>Gửi thông báo liên quan đến hợp đồng, báo giá và lịch làm việc.</li>
          <li>Cải thiện dịch vụ và xử lý sự cố kỹ thuật.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>4. Chia sẻ thông tin</h2>
        <p>Chúng tôi <strong>không bán</strong> thông tin của bạn cho bên thứ ba. Chúng tôi chỉ chia sẻ dữ liệu với:</p>
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>Supabase</strong> — lưu trữ cơ sở dữ liệu và xác thực người dùng.</li>
          <li><strong>Google LLC</strong> — khi bạn kết nối Google Calendar (theo yêu cầu của bạn).</li>
          <li><strong>Vercel</strong> — hosting ứng dụng web.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>5. Quyền của bạn</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>Bạn có thể ngắt kết nối Google Calendar bất kỳ lúc nào trong phần <em>Kết nối Calendar</em> trong dashboard.</li>
          <li>Bạn có thể yêu cầu xoá tài khoản và toàn bộ dữ liệu bằng cách liên hệ <a href="mailto:support@mstudo.com" style={{ color: "#3fb98a" }}>support@mstudo.com</a>.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>6. Bảo mật dữ liệu</h2>
        <p>Dữ liệu được mã hoá khi truyền tải (HTTPS) và lưu trữ trên hạ tầng bảo mật của Supabase. Refresh token Google Calendar được lưu trữ an toàn và chỉ dùng để đồng bộ sự kiện.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>7. Liên hệ</h2>
        <p>Mọi thắc mắc về chính sách bảo mật, vui lòng liên hệ: <a href="mailto:support@mstudo.com" style={{ color: "#3fb98a" }}>support@mstudo.com</a></p>
      </section>
    </div>
  );
}
