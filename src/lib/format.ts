export function formatHours(hours: number): string {
  // If the number is effectively an integer, omit decimals
  if (Math.abs(hours - Math.round(hours)) < 0.01) {
    return `${Math.round(hours)}h`;
  }
  return `${hours.toFixed(1)}h`;
}
