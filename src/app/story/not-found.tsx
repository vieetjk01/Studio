import { Heart } from "lucide-react";

export default function StoryNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-white px-6 text-center text-neutral-700">
      <div className="max-w-md">
        <Heart className="mx-auto mb-4 text-rose-400" />
        <h1 className="font-serif text-3xl">Không tìm thấy trang Love Story</h1>
        <p className="mx-auto mt-4 text-base text-neutral-500">Đường dẫn có thể chưa đúng, hoặc trang chưa được xuất bản.</p>
      </div>
    </main>
  );
}
