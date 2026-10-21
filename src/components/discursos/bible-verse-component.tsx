"use client";

import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { BookOpen } from "lucide-react";
import { useEditorContext } from "./editor-context";

export function BibleVerseComponent(props: NodeViewProps) {
  const { openVersePanel } = useEditorContext();

  const handleOpen = () => {
    openVersePanel({
      book: props.node.attrs.book,
      chapter: props.node.attrs.chapter,
      verse: props.node.attrs.verse,
      verseEnd: props.node.attrs.verseEnd ?? null,
      text: props.node.attrs.text,
    });
  };

  return (
    <NodeViewWrapper as="span" className="inline-block relative">
      <span
        onClick={handleOpen}
        className="bible-verse-chip"
        contentEditable={false}
      >
        <BookOpen size={12} className="opacity-80" />
        {props.node.attrs.text}
      </span>
    </NodeViewWrapper>
  );
}
