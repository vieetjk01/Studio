"use client";

import CreateAlbumFlow, { CreateHero } from "@/components/CreateAlbumFlow";

export default function CreatePage() {
  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <CreateHero />
      <CreateAlbumFlow />
    </div>
  );
}
