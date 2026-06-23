/**
 * Streaming skeleton shown instantly on every dashboard navigation while the
 * Server Component fetches its data. Without this the screen freezes on the
 * old page until all Supabase queries resolve.
 */
export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="mb-2 h-3 w-24 rounded" style={{ background: "var(--surface2)" }} />
          <div className="h-8 w-48 rounded" style={{ background: "var(--surface2)" }} />
        </div>
        <div className="h-9 w-32 rounded-xl" style={{ background: "var(--surface2)" }} />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="h-4 w-4 rounded" style={{ background: "var(--surface2)" }} />
            <div className="mt-3 h-6 w-20 rounded" style={{ background: "var(--surface2)" }} />
            <div className="mt-2 h-3 w-24 rounded" style={{ background: "var(--surface2)" }} />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card p-6">
            <div className="mb-4 h-5 w-40 rounded" style={{ background: "var(--surface2)" }} />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-12 rounded-xl" style={{ background: "var(--surface2)" }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
