export default function NewOrderLoading() {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
        <div className="h-5 w-5 animate-pulse rounded bg-muted" />
        <div className="h-6 w-28 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="flex gap-0 min-h-[480px]">
        <div className="flex-1 pr-6 space-y-6">
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="w-72 shrink-0 animate-pulse rounded-r-xl bg-muted" />
      </div>
    </div>
  );
}
