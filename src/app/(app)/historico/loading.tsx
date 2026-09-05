
export default function Loading() {
  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Header placeholder — no title text to flash */}
      <div className="h-[72px]" />

      <div className="flex flex-col gap-6 mt-4">
        <div className="flex flex-col">
          <div className="w-24 h-4 bg-[var(--surface)] animate-pulse rounded mb-3" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-[76px] rounded-lg bg-[var(--surface)] border border-[var(--border)] animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
