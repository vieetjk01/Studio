import { redirect } from "next/navigation";

// "Mẫu hợp đồng" đã gộp vào trang "Dịch vụ & điều khoản" (tab Mẫu hợp đồng).
export default function TemplatesPage() {
  redirect("/dashboard/studio/services?tab=templates");
}
