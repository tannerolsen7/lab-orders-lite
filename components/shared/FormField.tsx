import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export function FormField({
  label,
  name,
  error,
  className,
  children,
  ...inputProps
}: {
  label: string;
  name: string;
  error?: string;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<typeof Input>, "name">) {
  const errorId = error ? `${name}-error` : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name}>{label}</Label>
      {children ?? (
        <Input
          id={name}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={cn(
            error && "border-destructive focus-visible:ring-destructive"
          )}
          {...inputProps}
        />
      )}
      {error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
