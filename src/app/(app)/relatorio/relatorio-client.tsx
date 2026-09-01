"use client";

import { useState, useMemo } from "react";
import { format, getDaysInMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Copy, Printer, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, Field } from "@/components/ui/input";
import { useMonthRecords, useContacts } from "@/lib/db/hooks";
import { formatDuration } from "@/lib/utils";
import type { Profile } from "@/lib/db/dexie";
import { APP_NAME } from "@/lib/constants";
import Loading from "./loading";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: format(new Date(2024, i), "MMMM", { locale: ptBR }),
}));

const YEARS = Array.from({ length: 3 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: String(y) };
});

interface RelatorioClientProps {
  userId: string;
  profile: Profile;
}

export function RelatorioClient({ userId, profile }: RelatorioClientProps) {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [copied, setCopied] = useState(false);

  const { totalMinutes, records, loading: loadingRecords } = useMonthRecords(userId, year, month);
  const { contacts, loading: loadingContacts } = useContacts(userId);

  const revisitas     = contacts.filter((c) => c.status === "revisita").length;
  const estudosAtivos = contacts.filter((c) => c.status === "estudo_ativo").length;

  const loading = loadingRecords || loadingContacts;

  const monthLabel = format(new Date(year, month - 1), "MMMM 'de' yyyy", { locale: ptBR });
  const hoursTotal = (totalMinutes / 60).toFixed(1);

  const whatsappText = useMemo(() => {
    const lines = [
      `📋 *Relatório de ${monthLabel}*`,
      `👤 ${profile.full_name}`,
      profile.congregation_name ? `⛪ ${profile.congregation_name}` : "",
      ``,
      `⏱ Horas: ${hoursTotal}`,
      `🤝 Revisitas: ${revisitas}`,
      `📖 Estudos bíblicos: ${estudosAtivos}`,
      ``,
      `_Gerado com ${APP_NAME}_`,
    ].filter(Boolean).join("\n");
    return lines;
  }, [monthLabel, profile, hoursTotal, revisitas, estudosAtivos]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(whatsappText);
      setCopied(true);
      toast.success("Texto copiado — é só colar no WhatsApp");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Não foi possível copiar. Selecione e copie manualmente.");
    }
  };

  const handlePrint = () => window.print();

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-5">
      <AppHeader title="Relatório do mês" />

      {/* Month/year selectors */}
      <div className="flex gap-3 no-print">
        <Field label="Mês" htmlFor="report-month" className="flex-1">
          <Select
            id="report-month"
            options={MONTHS}
            value={String(month)}
            onChange={(e) => setMonth(Number(e.target.value))}
          />
        </Field>
        <Field label="Ano" htmlFor="report-year" className="flex-1">
          <Select
            id="report-year"
            options={YEARS}
            value={String(year)}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </Field>
      </div>

      {/* Report card */}
      <Card id="print-area">
        <div className="print-only mb-6">
          <h1 className="font-display font-semibold text-2xl text-[var(--ink)]">{APP_NAME}</h1>
          <p className="text-caption text-[var(--ink-muted)]">Relatório de pregação</p>
        </div>

        <p className="text-caption text-[var(--ink-muted)] mb-1 font-sans uppercase tracking-wide text-xs no-print">
          Resumo do mês
        </p>
        <h2 className="font-display font-semibold text-xl text-[var(--ink)] mb-5 capitalize">
          {monthLabel}
        </h2>

        <div className="flex flex-col divide-y divide-[var(--border)]">
          <ReportRow label="Nome" value={profile.full_name} />
          {profile.congregation_name && (
            <ReportRow label="Congregação" value={profile.congregation_name} />
          )}
          <ReportRow label="Horas totais" value={hoursTotal} highlight />
          <ReportRow label="Revisitas" value={String(revisitas)} />
          <ReportRow label="Estudos bíblicos" value={String(estudosAtivos)} />
        </div>
      </Card>

      {/* Preview of WhatsApp text */}
      <Card className="bg-[var(--background)] no-print">
        <p className="text-caption text-[var(--ink-muted)] mb-2">Prévia da mensagem</p>
        <pre className="font-sans text-sm text-[var(--ink)] whitespace-pre-wrap leading-relaxed">
          {whatsappText}
        </pre>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-3 no-print">
        <Button
          variant="primary"
          size="lg"
          onClick={handleCopy}
          className="w-full"
          id="btn-copy-report"
        >
          {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
          {copied ? "Copiado!" : "Copiar para WhatsApp"}
        </Button>

        <Button
          variant="secondary"
          size="lg"
          onClick={handlePrint}
          className="w-full"
          id="btn-print-report"
        >
          <Printer size={18} />
          Imprimir / Salvar PDF
        </Button>
      </div>
    </div>
  );
}

function ReportRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3.5">
      <span className="text-body-sm text-[var(--ink-muted)]">{label}</span>
      <span className={`font-sans font-semibold ${highlight ? "text-lg text-[var(--accent)]" : "text-base text-[var(--ink)]"}`}>
        {value}
      </span>
    </div>
  );
}
