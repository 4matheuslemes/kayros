"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const EditorClient = dynamic(
  () => import("./editor-client").then((mod) => mod.EditorClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    ),
  }
);
