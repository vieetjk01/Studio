import { redirect } from "next/navigation";

// Trình tạo kéo-thả giờ là trang chính ở /dashboard/site — chuyển hướng về đó.
export default function BuilderRedirect() {
  redirect("/dashboard/site");
}
