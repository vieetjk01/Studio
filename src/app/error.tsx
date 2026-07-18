"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Runtime errors: show a readable message, then (after a short grace period so
// the user can read it and choose Retry) send logged-in users back to the studio
// workspace and signed-out visitors home.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [home, setHome] = useState("/");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let signedIn = false;
      try {
        const { data: { user } } = await createClient().auth.getUser();
        signedIn = !!user;
      } catch {
        signedIn = false;
      }
      if (cancelled) return;
      const dest = signedIn ? "/dashboard/studio" : "/";
      setHome(dest);
      // Grace period so the retry button is actually usable.
      const timer = setTimeout(() => router.replace(dest), 6000);
      return () => clearTimeout(timer);
    })();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center">
      <div className="max-w-sm">
        <h1 className="font-serif text-3xl font-medium">Đã có lỗi xảy ra</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
          Xin lỗi vì sự cố. Bạn có thể thử lại hoặc quay về trang chính.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2.5">
          <button onClick={reset} className="btn-primary">Thử lại</button>
          <button onClick={() => router.replace(home)} className="btn-ghost">Về trang chính</button>
        </div>
      </div>
    </div>
  );
}
