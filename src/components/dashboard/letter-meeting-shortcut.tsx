"use client";

import { PenLine, Share2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { LETTER_MEETING_LINK, LETTER_MEETING_MESSAGE } from "@/lib/constants";

export function LetterMeetingShortcut() {
  async function handleShareLetterInvite() {
    const message = LETTER_MEETING_MESSAGE(LETTER_MEETING_LINK);

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
      </div>
    </Card>
  );
}
