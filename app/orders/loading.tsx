export default function OrdersLoading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
        <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-20 animate-pulse rounded-lg bg-muted" />
        ))}
        <div className="ml-auto h-10 w-56 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
