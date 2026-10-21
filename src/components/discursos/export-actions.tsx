"use client";

import { useMemo, useState } from "react";
import { FileDown, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { buildTransferMessage } from "@/lib/discursos/outline-export";

interface ExportActionsProps {
  title: string;
  category: string | null;
  content: any;
}

// Acima de ~6.000 caracteres o link wa.me costuma ser truncado ou rejeitado por navegadores
const WA_MAX_URL = 6000;

function hasContent(content: any) {
  return Array.isArray(content?.content) && content.content.length > 0;
}

export function ExportActions({ title, category, content }: ExportActionsProps) {
  const supabase = useMemo(() => createClient(), []);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleExportPdf() {
    if (!hasContent(content)) {
      toast.error("O esboço está vazio.");
      return;
    }
    setPdfLoading(true);
    try {
      const res = await fetch("/api/discursos/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category, content }),
      });

      if (!res.ok) {
        throw new Error(String(res.status));
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(title.trim() || "esboco").replace(/[\\/:*?"<>|]+/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success("PDF gerado com sucesso.");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleTransfer() {
    if (!hasContent(content)) {
      toast.error("O esboço está vazio.");
      return;
    }
    setSending(true);
    try {
      const message = await buildTransferMessage(supabase, title, category, content);

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: `Esboço: ${title}`, text: message });
          return;
        } catch (e: any) {
          if (e?.name === "AbortError") return; // cancelado pelo usuário
        }
      }

      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      if (url.length <= WA_MAX_URL) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        await navigator.clipboard.writeText(message);
        toast.info("Esboço longo demais para o link direto — texto copiado para a área de transferência. Cole no WhatsApp.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível preparar o esboço para envio.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        id="export-pdf-button"
        type="button"
        variant="secondary"
        size="sm"
        className="h-8 px-2.5 sm:px-3 rounded-full text-xs"
        onClick={handleExportPdf}
        disabled={pdfLoading}
        title="Exportar como documento PDF"
      >
        {pdfLoading ? (
          <Loader2 size={13} className="mr-1.5 animate-spin" />
        ) : (
          <FileDown size={13} className="mr-1.5" />
        )}
        PDF
      </Button>
      <Button
        id="transfer-outline-button"
        type="button"
        variant="secondary"
        size="sm"
        className="h-8 px-2.5 sm:px-3 rounded-full text-xs"
        onClick={handleTransfer}
        disabled={sending}
        title="Transferir via WhatsApp / Compartilhar"
      >
        {sending ? (
          <Loader2 size={13} className="mr-1.5 animate-spin" />
        ) : (
          <Send size={13} className="mr-1.5" />
        )}
        Transferir
      </Button>
    </div>
  );
}
