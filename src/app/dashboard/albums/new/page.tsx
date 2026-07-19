"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

function slugify(s: string) {
  const base = s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "album"}-${suffix}`;
}

export default function NewAlbumPage() {
  const { t } = useLang();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("albums")
      .insert({ owner_id: user.id, title, slug: slugify(title) })
      .select("id")
      .single();

    if (error || !data) {
      setError(error?.message ?? t("error"));
      setLoading(false);
      return;
    }
    router.push(`/dashboard/albums/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-lg animate-fade-in">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-accent-muted hover:text-accent">
        <ArrowLeft size={15} /> {t("back")}
      </Link>
      <form onSubmit={create} className="card p-8">
        <h1 className="mb-6 text-xl font-light text-accent">{t("newAlbum")}</h1>
        <label className="label">{t("albumTitle")}</label>
        <input
          required
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input mb-6"
          placeholder="Wedding — A & B"
        />
        {error && <p className="mb-4 text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
        <button disabled={loading} className="btn-primary w-full">
          {loading ? t("saving") : t("newAlbum")}
        </button>
      </form>
    </div>
  );
}
