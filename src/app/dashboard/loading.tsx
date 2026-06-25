/**
 * Streaming skeleton shown instantly on every dashboard navigation while the
 * Server Component fetches its data. Without this the screen freezes on the
 * old page until all Supabase queries resolve.
 */
export default function DashboardLoading() {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="skeleton mb-2 h-3 w-24" />
          <div className="skeleton h-8 w-48" />
        </div>
        <div className="skeleton h-9 w-32 rounded-full" />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-4 w-4" />
            <div className="skeleton mt-3 h-6 w-20" />
            <div className="skeleton mt-2 h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card p-6">
            <div className="skeleton mb-4 h-5 w-40" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="skeleton h-12 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
