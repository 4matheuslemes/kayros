"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import { BibleVerse } from "./bible-verse-node";
import { PanelBlock } from "./panel-block-node";
import { InsertPanelBlockDialog } from "./insert-panel-block-dialog";
import { useEditorContext } from "./editor-context";
import { VerseSuggestion } from "./verse-suggestion-extension";
import { BackstageMark } from "./backstage-mark";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  ListChecks,
  RotateCcw,
  Heading1,
  Heading2,
  EyeOff,
  PanelRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JSONContent } from "@tiptap/core";

interface OutlineEditorProps {
  initialContent: JSONContent;
  onChange: (content: JSONContent) => void;
}

export function OutlineEditor({ initialContent, onChange }: OutlineEditorProps) {
  const { setEditor, openPanel } = useEditorContext();
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // Sem UI de links: nada de autolink/colagem e o clique nunca abre sites
        link: {
          openOnClick: false,
          autolink: false,
          linkOnPaste: false,
        },
      }),
      Underline,
      TaskList,
      TaskItem.configure({
        nested: false,
      }),
      Placeholder.configure({
        placeholder:
          "Comece a escrever seu esboço aqui... (digite / para inserir um versículo)",
      }),
      BibleVerse,
      PanelBlock,
      VerseSuggestion,
      BackstageMark,
    ],
    content: initialContent || { type: "doc", content: [] },
    editorProps: {
      attributes: {
        class:
          "tiptap-editor focus:outline-none w-full min-w-0 min-h-[60vh] py-4",
      },
      // Ao colar HTML de páginas web, mantém o texto e descarta os links
      transformPastedHTML: (html) => html.replace(/<\/?a\b[^>]*>/gi, ""),
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  useEffect(() => {
    setEditor(editor);
    return () => setEditor(null);
  }, [editor, setEditor]);

  if (!editor) return null;

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor.chain().focus().toggleUnderline().run();
  const toggleBulletList = () => editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run();
  const toggleTaskList = () => editor.chain().focus().toggleTaskList().run();
  const toggleH1 = () => editor.chain().focus().toggleHeading({ level: 1 }).run();
  const toggleH2 = () => editor.chain().focus().toggleHeading({ level: 2 }).run();
  const toggleBackstage = () => editor.chain().focus().toggleMark("backstage").run();

  const uncheckAllTasks = () => {
    editor
      .chain()
      .focus()
      .command(({ tr, dispatch }) => {
        let changed = false;
        tr.doc.descendants((node, pos) => {
          if (node.type.name === "taskItem" && node.attrs.checked) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, checked: false });
            changed = true;
          }
        });
        if (changed && dispatch) dispatch(tr);
        return changed;
      })
      .run();
  };

  // Simula a digitação de "/" no cursor para disparar a sugestão flutuante
  const triggerVersePopup = () => {
    editor.chain().focus().insertContent("/").run();
  };

  const handleInsertBlock = ({
    label,
    optional,
  }: {
    label: string;
    optional: boolean;
  }) => {
    const blockId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    editor
      .chain()
      .focus()
      .insertPanelBlock({
        blockId,
        label,
        body: "",
        optional,
      })
      .run();

    openPanel({
      kind: "block",
      blockId,
      label,
      body: "",
      optional,
    });
  };

  return (
    <div className="w-full flex flex-col relative min-w-0">
      <div className="sticky top-0 z-10 bg-[var(--surface)]/95 backdrop-blur-sm border-b border-[var(--border)] py-2 px-1 mb-4 flex items-center gap-1 overflow-x-auto no-scrollbar">
        <ToolbarButton
          onClick={toggleH1}
          active={editor.isActive("heading", { level: 1 })}
          icon={<Heading1 size={18} />}
          label="H1"
        />
        <ToolbarButton
          onClick={toggleH2}
          active={editor.isActive("heading", { level: 2 })}
          icon={<Heading2 size={18} />}
          label="H2"
        />
        <div className="w-px h-6 bg-[var(--border)] mx-1 shrink-0" />
        <ToolbarButton
          onClick={toggleBold}
          active={editor.isActive("bold")}
          icon={<Bold size={18} />}
          label="Negrito"
        />
        <ToolbarButton
          onClick={toggleItalic}
          active={editor.isActive("italic")}
          icon={<Italic size={18} />}
          label="Itálico"
        />
        <ToolbarButton
          onClick={toggleUnderline}
          active={editor.isActive("underline")}
          icon={<UnderlineIcon size={18} />}
          label="Sublinhado"
        />
        <div className="w-px h-6 bg-[var(--border)] mx-1 shrink-0" />
        <ToolbarButton
          onClick={toggleBulletList}
          active={editor.isActive("bulletList")}
          icon={<List size={18} />}
          label="Lista com marcadores"
        />
        <ToolbarButton
          onClick={toggleOrderedList}
          active={editor.isActive("orderedList")}
          icon={<ListOrdered size={18} />}
          label="Lista numerada"
        />
        <ToolbarButton
          onClick={toggleTaskList}
          active={editor.isActive("taskList")}
          icon={<ListChecks size={18} />}
          label="Lista de tarefas"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={uncheckAllTasks}
          title="Desmarcar todas as tarefas do esboço"
          className="text-xs h-8 px-2 text-[var(--ink-muted)] hover:text-[var(--ink)] shrink-0 gap-1"
        >
          <RotateCcw size={13} />
          <span>Desmarcar tudo</span>
        </Button>
        <div className="w-px h-6 bg-[var(--border)] mx-1 shrink-0" />

        {/* Nota de Bastidor */}
        <ToolbarButton
          onClick={toggleBackstage}
          active={editor.isActive("backstage")}
          icon={<EyeOff size={16} />}
          label="Nota de bastidor (Ctrl+Shift+B)"
          variant="backstage"
        />

        <div className="w-px h-6 bg-[var(--border)] mx-1 shrink-0" />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={triggerVersePopup}
          className="text-xs h-8 text-[var(--verse-accent)] border-[var(--verse-accent)]/30 hover:bg-[var(--verse-accent-bg)] shrink-0"
        >
          + Versículo (/)
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setIsBlockDialogOpen(true)}
          className="text-xs h-8 text-[var(--accent)] border-[var(--accent)]/30 hover:bg-[var(--accent)]/10 shrink-0 gap-1"
          title="Inserir bloco no painel lateral"
        >
          <PanelRight size={13} />
          <span>+ Bloco no painel</span>
        </Button>
      </div>

      <EditorContent editor={editor} className="w-full min-w-0" />

      <InsertPanelBlockDialog
        open={isBlockDialogOpen}
        onOpenChange={setIsBlockDialogOpen}
        onConfirm={handleInsertBlock}
      />
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  icon,
  label,
  variant = "default",
}: {
  onClick: () => void;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  variant?: "default" | "backstage";
}) {
  const activeClass =
    variant === "backstage"
      ? "bg-[var(--ink-muted)]/15 text-[var(--ink-muted)]"
      : "bg-[var(--primary)]/10 text-[var(--primary)]";

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`p-1.5 rounded-md transition-colors cursor-pointer shrink-0 ${
        active
          ? activeClass
          : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--background)]"
      }`}
    >
      {icon}
    </button>
  );
}
