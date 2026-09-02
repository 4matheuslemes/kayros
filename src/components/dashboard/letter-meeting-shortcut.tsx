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
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenLine size={18} className="text-[var(--primary)]" />
          Cartas em Grupo
        </CardTitle>
      </CardHeader>
      
      <div className="flex items-center justify-between gap-4">
        {meetingLink ? (
          <>
            <p className="text-body-sm text-[var(--ink-muted)] leading-snug">
              Vamos escrever cartas juntos? Convide alguém para uma videochamada.
            </p>
            <button
              onClick={handleShareLetterInvite}
              className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] transition-colors shadow-sm"
              aria-label="Compartilhar convite"
            >
              <Share2 size={18} />
            </button>
          </>
        ) : (
          <>
            <p className="text-body-sm text-[var(--ink-muted)] leading-snug">
              Configure sua sala de reunião no Perfil para usar este atalho.
            </p>
            <Link
              href="/perfil"
              className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] hover:bg-[var(--background)] transition-colors shadow-sm"
              aria-label="Configurar no perfil"
            >
              <Settings size={18} />
            </Link>
          </>
        )}
      </div>
    </Card>
  );
}
