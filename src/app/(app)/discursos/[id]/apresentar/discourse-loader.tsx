"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const DiscourseClient = dynamic(
  () => import("./discourse-client").then((mod) => mod.DiscourseClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    ),
  }
);
