"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { OutlineDiscourse } from "@/components/discursos/outline-discourse";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/core";

interface DiscourseClientProps {
  id: string;
}

export function DiscourseClient({ id }: DiscourseClientProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [outline, setOutline] = useState<{
    id: string;
    title: string;
    category: string | null;
    content: JSONContent;
  } | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("outlines")
        .select("id, title, category, content")
        .eq("id", id)
        .single();

      if (error || !data) {
        toast.error("Não foi possível carregar o esboço para apresentação.");
        router.push("/discursos");
        return;
      }

      setOutline(data);
      setLoading(false);
    }

    load();
  }, [id, router, supabase]);

  if (loading || !outline) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <OutlineDiscourse
      id={outline.id}
      title={outline.title}
      category={outline.category}
      content={outline.content}
    />
  );
}
