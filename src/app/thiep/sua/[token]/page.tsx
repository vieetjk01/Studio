import type { Metadata } from "next";
import WeddingEditor from "./WeddingEditor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chỉnh sửa thiệp cưới",
  robots: { index: false, follow: false },
};

export default function EditWeddingPage({ params }: { params: { token: string } }) {
  return <WeddingEditor token={params.token} />;
}
