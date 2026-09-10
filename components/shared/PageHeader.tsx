import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between pb-6",
        className
      )}
    >
      <h1 className="min-w-0 max-w-lg truncate text-2xl font-semibold tracking-tight">{title}</h1>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
