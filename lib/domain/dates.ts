// ISO date strings (YYYY-MM-DD) sort lexicographically, so string comparison is safe here
export function isDateInPast(dateString: string): boolean {
  const today = new Date().toISOString().split("T")[0];
  return dateString <= today;
}

export function toUTCDate(dateString: string): Date {
  return new Date(dateString + "T00:00:00Z");
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
