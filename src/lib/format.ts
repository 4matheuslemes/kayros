export function formatHours(hours: number): string {
  if (hours <= 0) return "0h";
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  
  // Ex: 1h 30min
  return `${h}h ${m}min`;
}
