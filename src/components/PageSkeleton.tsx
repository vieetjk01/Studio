/**
 * Generic page skeleton shown via loading.tsx while a dynamic studio page
 * fetches on the server. Gives instant navigation feedback (perceived speed)
 * instead of a frozen/blank screen. Uses the studio shell tokens so it matches
 * whatever theme is active.
 */
export default function PageSkeleton({ stats = 4, rows = 6 }: { stats?: number; rows?: number }) {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Đang tải">
      {/* Title bar */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-7 w-48 rounded-lg" style={{ background: "var(--surface2)" }} />
        <div className="ml-auto h-9 w-32 rounded-lg" style={{ background: "var(--surface2)" }} />
      </div>

      {/* Stat cards */}
      {stats > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: stats }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="h-3 w-20 rounded" style={{ background: "var(--surface2)" }} />
              <div className="mt-4 h-7 w-24 rounded" style={{ background: "var(--surface2)" }} />
            </div>
          ))}
        </div>
      )}

      {/* Content rows */}
      <div className="card p-6">
        <div className="mb-4 h-5 w-40 rounded" style={{ background: "var(--surface2)" }} />
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl p-3" style={{ background: "var(--surface2)" }}>
              <div className="h-10 w-10 flex-none rounded-lg" style={{ background: "var(--border)" }} />
              <div className="flex-1">
                <div className="h-3.5 w-1/3 rounded" style={{ background: "var(--border)" }} />
                <div className="mt-2 h-3 w-1/4 rounded" style={{ background: "var(--border)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
