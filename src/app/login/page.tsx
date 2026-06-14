"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Brand from "@/components/Brand";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const { t } = useLang();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Guard: NEXT_PUBLIC_* vars are inlined at build time. If they're missing
    // the auth request would hang forever — fail fast with a clear message.
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      setError(
        "Thiếu cấu hình Supabase (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY). Thêm trên Vercel rồi Redeploy."
      );
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      // Fail instead of hanging if Supabase is unreachable (paused project, bad URL).
      const timeout = new Promise<{ error: { message: string } }>((resolve) =>
        setTimeout(
          () => resolve({ error: { message: "Hết thời gian kết nối tới Supabase. Kiểm tra URL/khóa và xem project có đang bị pause không." } }),
          15000
        )
      );
      const { error } = (await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeout,
      ])) as { error: { message: string } | null };

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <Brand />
        <LanguageSwitcher />
      </header>

      <div className="flex flex-1 items-center justify-center px-6">
        <form
          onSubmit={handleSubmit}
          className="card w-full max-w-sm animate-fade-in p-8"
        >
          <h1 className="text-xl font-medium text-accent">{t("login")}</h1>
          <p className="mt-1 mb-6 text-sm text-accent-muted">{t("loginSubtitle")}</p>

          <label className="label">{t("email")}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input mb-4"
            placeholder="you@example.com"
          />

          <label className="label">{t("password")}</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input mb-6"
            placeholder="••••••••"
          />

          {error && (
            <p className="mb-4 text-sm text-red-400">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? t("signingIn") : t("login")}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
