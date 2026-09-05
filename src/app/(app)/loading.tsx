
export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      {/* Header placeholder — neutral height, no title text to flash */}
      <div className="h-[72px]" />

      {/* Main cards skeleton */}
      <div className="w-full h-[140px] bg-[var(--surface)] border border-[var(--border)] rounded-2xl animate-pulse" />
      <div className="w-full h-[200px] bg-[var(--surface)] border border-[var(--border)] rounded-2xl animate-pulse" />
      <div className="w-full h-[120px] bg-[var(--surface)] border border-[var(--border)] rounded-2xl animate-pulse" />
      
      {/* List skeleton */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="w-full h-[76px] bg-[var(--surface)] border border-[var(--border)] rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}
