import { requireStudio } from "@/lib/auth-guards";
import NewQuoteForm from "./NewQuoteForm";

export const dynamic = "force-dynamic";

export default async function NewQuotePage() {
  const profile = await requireStudio();
  if (!profile) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Cần gói Studio</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>Báo giá chỉ dành cho tài khoản gói <b>Studio</b>.</p>
          <a href="/dashboard/upgrade" className="btn-primary mt-5">Xem gói Studio</a>
        </div>
      </div>
    );
  }

  return <NewQuoteForm ownerId={profile.id} />;
}
