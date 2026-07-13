import { requireStudio } from "@/lib/auth-guards";
import ContractsListView from "./ContractsListView";

// Trang chỉ gác quyền; danh sách hợp đồng được tải client-side + cache trên máy
// (hiển thị tức thì, làm mới ngầm) qua /api/studio/contracts-list — bỏ độ trễ
// chờ server render lại mỗi lần mở trang.
export default async function ContractsList() {
  const profile = await requireStudio("plus");
  if (!profile) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Cần gói Studio</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
            Tính năng này chỉ dành cho tài khoản gói Studio.
          </p>
          <a href="/dashboard/upgrade" className="btn-primary mt-5">Xem gói Studio</a>
        </div>
      </div>
    );
  }
  return <ContractsListView />;
}
