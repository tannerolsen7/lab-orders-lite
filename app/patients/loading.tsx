export default function PatientsLoading() {
  return (
    <div>
      <div className="mb-6 h-9 w-32 animate-pulse rounded-lg bg-muted" />
      <div className="mb-4 flex items-center gap-4">
        <div className="h-10 flex-1 animate-pulse rounded-lg bg-muted" />
        <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
