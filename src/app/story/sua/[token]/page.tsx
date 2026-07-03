import type { Metadata } from "next";
import StoryEditor from "./StoryEditor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Chỉnh sửa Love Story", robots: { index: false, follow: false } };

export default function EditStoryPage({ params }: { params: { token: string } }) {
  return <StoryEditor token={params.token} />;
}
