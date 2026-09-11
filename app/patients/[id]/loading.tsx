export default function PatientDetailLoading() {
  return (
    <div>
      <div className="mb-6 h-9 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="mb-6 h-5 w-32 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
