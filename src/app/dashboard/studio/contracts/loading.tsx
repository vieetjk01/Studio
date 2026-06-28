export default function ContractsLoading() {
  return (
    <div>
      {/* Header row */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="skeleton mb-2 h-4 w-28" />
          <div className="skeleton h-7 w-44" />
        </div>
        <div className="skeleton h-9 w-36 rounded-full" />
      </div>

      {/* Filter chips */}
      <div className="mb-5 flex gap-2">
        {[72, 88, 64, 80].map((w, i) => (
          <div key={i} className="skeleton h-7 rounded-full" style={{ width: w }} />
        ))}
      </div>

      {/* Contract rows */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-20" />
                <div className="skeleton h-5 w-56" />
                <div className="skeleton h-3 w-36" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="skeleton h-5 w-24" />
                <div className="skeleton h-6 w-20 rounded-full" />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <div className="skeleton h-7 w-20 rounded-full" />
              <div className="skeleton h-7 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
