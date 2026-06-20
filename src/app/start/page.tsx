import StartClient from "./StartClient";

// Rendered dynamically so the build never tries to statically prerender it
// (the client component creates a Supabase client, which needs env vars).
export const dynamic = "force-dynamic";

export default function StartPage() {
  return <StartClient />;
}
