import { AppHeader } from "@/components/layout/app-header";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <AppHeader
        title="Interessados"
        right={
          <Button variant="primary" size="icon" disabled>
            <Plus size={20} />
          </Button>
        }
      />

      {/* Search Skeleton */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-3.5 text-[var(--ink-muted)]" />
        <div className="w-full h-11 bg-[var(--surface)] border border-[var(--border)] rounded-md animate-pulse" />
      </div>

      {/* Filter chips Skeleton */}
      <div className="flex gap-2">
        <div className="w-20 h-8 rounded-full bg-[var(--surface)] border border-[var(--border)] animate-pulse" />
        <div className="w-24 h-8 rounded-full bg-[var(--surface)] border border-[var(--border)] animate-pulse" />
        <div className="w-24 h-8 rounded-full bg-[var(--surface)] border border-[var(--border)] animate-pulse" />
      </div>

      {/* List Skeleton */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[76px] rounded-lg bg-[var(--surface)] border border-[var(--border)] animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
