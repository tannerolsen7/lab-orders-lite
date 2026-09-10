export function dollarsToCents(dollars: string): number {
  return Math.round(parseFloat(dollars) * 100);
}

export function centsToDollars(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
