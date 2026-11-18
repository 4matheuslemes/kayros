"use client";

import React from "react";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { PanelRight } from "lucide-react";
import { useEditorContext } from "./editor-context";
import { cn } from "@/lib/utils";

export function PanelBlockComponent(props: NodeViewProps) {
  const { togglePanel, isPanelOpen, activeItem } = useEditorContext();

  const blockId = props.node.attrs.blockId as string;
  const label = (props.node.attrs.label as string) || "Bloco";
  const body = (props.node.attrs.body as string) || "";
  const optional = Boolean(props.node.attrs.optional);

  const isActive =
    isPanelOpen &&
    activeItem?.kind === "block" &&
    activeItem.blockId === blockId;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    togglePanel({
      kind: "block",
      blockId,
      label,
      body,
      optional,
    });
  };

  return (
    <NodeViewWrapper as="span" className="inline-block relative select-none">
      <span
        onClick={handleClick}
        contentEditable={false}
        className={cn(
          "panel-block-chip",
          optional && "panel-block-chip--optional",
          isActive && "panel-block-chip--active"
        )}
        title={optional ? `${label} (se houver tempo)` : label}
      >
        <PanelRight size={12} className="opacity-80 shrink-0" />
        <span className="panel-block-label">{label}</span>
        {optional && (
          <span className="panel-block-optional-tag text-[var(--ink-muted)] text-[0.75rem] font-normal ml-0.5">
            (se houver tempo)
          </span>
        )}
      </span>
    </NodeViewWrapper>
  );
}
