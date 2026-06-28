"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Runtime errors: send logged-in users back to the studio workspace, and
// signed-out visitors to the home page (mirrors not-found behaviour).
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      let signedIn = false;
      try {
        const { data: { user } } = await createClient().auth.getUser();
        signedIn = !!user;
      } catch {
        signedIn = false;
      }
      router.replace(signedIn ? "/dashboard/studio" : "/");
    })();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center">
      <div>
        <p className="text-sm" style={{ color: "var(--text2)" }}>Đang chuyển hướng…</p>
        <button onClick={reset} className="btn-ghost mt-4 text-xs">Thử lại</button>
      </div>
    </div>
  );
}
