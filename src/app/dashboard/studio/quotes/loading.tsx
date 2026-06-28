export default function QuotesLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="skeleton mb-2 h-7 w-48" />
          <div className="skeleton h-3 w-72" />
        </div>
        <div className="skeleton h-9 w-36 rounded-full" />
      </div>

      {/* Quote rows */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-16" />
                <div className="skeleton h-5 w-52" />
                <div className="skeleton h-3 w-40" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="skeleton h-5 w-24" />
                <div className="skeleton h-3 w-16" />
                <div className="skeleton h-7 w-28 rounded-lg" />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <div className="skeleton h-7 w-24 rounded-full" />
              <div className="skeleton h-7 w-28 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
