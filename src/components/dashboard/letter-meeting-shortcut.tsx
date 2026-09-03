"use client";

import { PenLine, Share2, Settings } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface LetterMeetingShortcutProps {
  meetingLink?: string;
}

export function LetterMeetingShortcut({ meetingLink }: LetterMeetingShortcutProps) {
  async function handleShareLetterInvite() {
    if (!meetingLink) return;
    const message = `Olá! 😊 Que tal escrevermos algumas cartas juntos? Entra na nossa videochamada quando puder:\n${meetingLink}`;

    if (navigator.share) {
      try {
        await navigator.share({ text: message });
      } catch (err) {
        // user canceled or unsupported, fail silently
      }
    } else {
      // Fallback for desktop/unsupported browsers
      const encoded = encodeURIComponent(message);
      window.open(`https://wa.me/?text=${encoded}`, "_blank");
    }
  }

  return (
    <Card className="flex items-center justify-between p-3 gap-3 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-[var(--primary)]/10 text-[var(--primary)]">
          <PenLine size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold text-[15px] text-[var(--ink)] leading-tight truncate">
            Cartas em Grupo
          </h3>
          <p className="text-[12px] text-[var(--ink-muted)] leading-tight truncate mt-0.5">
            {meetingLink ? "Vamos escrever juntos?" : "Configure sua sala"}
          </p>
        </div>
      </div>
      
      {meetingLink ? (
        <button
          onClick={handleShareLetterInvite}
          className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] transition-colors shadow-sm"
          aria-label="Compartilhar convite"
        >
          <Share2 size={16} />
        </button>
      ) : (
        <Link
          href="/perfil"
          className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] hover:bg-[var(--background)] transition-colors shadow-sm"
          aria-label="Configurar no perfil"
        >
          <Settings size={16} />
        </Link>
      )}
    </Card>
  );
}
