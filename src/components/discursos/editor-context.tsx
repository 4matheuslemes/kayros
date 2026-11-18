"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import type { Editor } from "@tiptap/core";

export interface PanelVersePayload {
  kind: "verse";
  book: number;
  chapter: number;
  verse: number;
  verseEnd?: number | null;
  text: string;
}

export interface PanelBlockPayload {
  kind: "block";
  blockId: string;
  label: string;
  body: string;
  optional?: boolean;
}

export type PanelItem = PanelVersePayload | PanelBlockPayload;

// Compatibilidade retroativa com código existente
export type SelectedVerse = Omit<PanelVersePayload, "kind">;

interface EditorContextValue {
  activeItem: PanelItem | null;
  selectedVerse: SelectedVerse | null;
  isPanelOpen: boolean;
  openPanel: (item: PanelItem) => void;
  closePanel: () => void;
  togglePanel: (item: PanelItem) => void;
  openVersePanel: (verse: SelectedVerse) => void;
  closeVersePanel: () => void;
  updateBlockBody: (blockId: string, body: string) => void;
  setEditor: (editor: Editor | null) => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

function isSameItem(a: PanelItem | null, b: PanelItem): boolean {
  if (!a) return false;
  if (a.kind !== b.kind) return false;
  if (a.kind === "verse" && b.kind === "verse") {
    return (
      a.book === b.book &&
      a.chapter === b.chapter &&
      a.verse === b.verse &&
      (a.verseEnd ?? null) === (b.verseEnd ?? null)
    );
  }
  if (a.kind === "block" && b.kind === "block") {
    return a.blockId === b.blockId;
  }
  return false;
}

export function EditorProvider({ children }: { children: ReactNode }) {
  const [activeItem, setActiveItem] = useState<PanelItem | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const editorRef = useRef<Editor | null>(null);
  const activeItemRef = useRef<PanelItem | null>(activeItem);

  useEffect(() => {
    activeItemRef.current = activeItem;
  }, [activeItem]);

  const setEditor = useCallback((editor: Editor | null) => {
    editorRef.current = editor;
  }, []);

  const openPanel = useCallback((item: PanelItem) => {
    setActiveItem(item);
    setIsPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const togglePanel = useCallback((item: PanelItem) => {
    setIsPanelOpen((prevOpen) => {
      if (prevOpen && isSameItem(activeItemRef.current, item)) {
        return false;
      }
      setActiveItem(item);
      return true;
    });
  }, []);

  const openVersePanel = useCallback(
    (verse: SelectedVerse) => {
      openPanel({ kind: "verse", ...verse });
    },
    [openPanel]
  );

  const closeVersePanel = useCallback(() => {
    closePanel();
  }, [closePanel]);

  const updateBlockBody = useCallback((blockId: string, body: string) => {
    setActiveItem((prev) => {
      if (prev && prev.kind === "block" && prev.blockId === blockId) {
        return { ...prev, body };
      }
      return prev;
    });

    if (editorRef.current && !editorRef.current.isDestroyed) {
      editorRef.current.commands.updatePanelBlockBody(blockId, body);
    }
  }, []);

  const selectedVerse: SelectedVerse | null =
    activeItem?.kind === "verse"
      ? {
          book: activeItem.book,
          chapter: activeItem.chapter,
          verse: activeItem.verse,
          verseEnd: activeItem.verseEnd,
          text: activeItem.text,
        }
      : null;

  return (
    <EditorContext.Provider
      value={{
        activeItem,
        selectedVerse,
        isPanelOpen,
        openPanel,
        closePanel,
        togglePanel,
        openVersePanel,
        closeVersePanel,
        updateBlockBody,
        setEditor,
      }}
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
