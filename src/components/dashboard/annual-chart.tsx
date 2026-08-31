"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2 } from "lucide-react";
import { getServiceYear } from "@/lib/utils";
import type { DailyRecord } from "@/lib/db/dexie";

const MONTHS_PT = ["Set", "Out", "Nov", "Dez", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago"];

interface AnnualChartProps {
  records: DailyRecord[];
  goalHours: number;
}

function buildChartData(records: DailyRecord[], serviceYear: number) {
  // Service year: Sep (serviceYear) → Aug (serviceYear+1)
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthIdx = (i + 8) % 12; // 0=Sep,1=Oct,...,11=Aug
    const year     = monthIdx >= 8 ? serviceYear : serviceYear + 1;
    const monthStr = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
    const total    = records
      .filter((r) => r.date.startsWith(monthStr))
      .reduce((s, r) => s + r.duration_minutes, 0);
    return { month: MONTHS_PT[i], hours: +(total / 60).toFixed(1) };
  });
  return months;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-card text-sm font-sans">
      <p className="font-medium text-[var(--ink)]">{label}</p>
      <p className="text-[var(--ink-muted)]">{payload[0].value}h</p>
    </div>
  );
}

export function AnnualChart({ records, goalHours }: AnnualChartProps) {
  const serviceYear = getServiceYear();
  const data        = buildChartData(records, serviceYear);
  const now         = new Date();
  const currentMonthIdx = (now.getMonth() - 8 + 12) % 12; // relative to Sep

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart2 size={18} className="text-[var(--primary)]" />
          Ano de serviço {serviceYear}/{serviceYear + 1}
        </CardTitle>
      </CardHeader>

      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -28 }}>
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "var(--ink-muted)", fontFamily: "var(--font-inter)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--ink-muted)", fontFamily: "var(--font-inter)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--background)" }} />
          <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={28}>
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={
                  index === currentMonthIdx
                    ? "var(--primary)"
                    : index < currentMonthIdx
                    ? "var(--success)"
                    : "var(--border)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-3 text-caption text-[var(--ink-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[var(--primary)] inline-block" />
          Mês atual
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[var(--success)] inline-block" />
          Concluído
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[var(--border)] inline-block" />
          Futuro
        </span>
      </div>
    </Card>
  );
}
