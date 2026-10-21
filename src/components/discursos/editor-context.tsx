"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export interface SelectedVerse {
  book: number;
  chapter: number;
  verse: number;
  verseEnd?: number | null;
  text: string;
}

interface EditorContextValue {
  selectedVerse: SelectedVerse | null;
  isPanelOpen: boolean;
  openVersePanel: (verse: SelectedVerse) => void;
  closeVersePanel: () => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [selectedVerse, setSelectedVerse] = useState<SelectedVerse | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const openVersePanel = (verse: SelectedVerse) => {
    setSelectedVerse(verse);
    setIsPanelOpen(true);
  };

  const closeVersePanel = () => {
    setIsPanelOpen(false);
  };

  return (
    <EditorContext.Provider
      value={{ selectedVerse, isPanelOpen, openVersePanel, closeVersePanel }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditorContext() {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error("useEditorContext must be used within EditorProvider");
  }
  return ctx;
}
