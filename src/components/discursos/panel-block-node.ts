import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { PanelBlockComponent } from "./panel-block-component";

export interface PanelBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    panelBlock: {
      /**
       * Inserir nó de bloco lateral (abre no painel lateral).
       */
      insertPanelBlock: (options: {
        blockId?: string;
        label: string;
        body?: string;
        optional?: boolean;
      }) => ReturnType;

      /**
       * Atualiza o corpo de um bloco procurando pelo seu blockId.
       */
      updatePanelBlockBody: (blockId: string, body: string) => ReturnType;
    };
  }
}

export const PanelBlock = Node.create<PanelBlockOptions>({
  name: "panelBlock",

  group: "inline",
  inline: true,
  selectable: true,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: "panel-block-chip",
      },
    };
  },

  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-block-id") ||
          (typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2)),
        renderHTML: (attributes) => ({
          "data-block-id": attributes.blockId,
        }),
      },
      label: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-label") || "",
        renderHTML: (attributes) => ({
          "data-label": attributes.label,
        }),
      },
      body: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-body") || "",
        renderHTML: (attributes) => ({
          "data-body": attributes.body,
        }),
      },
      optional: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-optional") === "true",
        renderHTML: (attributes) => ({
          "data-optional": attributes.optional ? "true" : "false",
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="panel-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "panel-block",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PanelBlockComponent);
  },

  addCommands() {
    return {
      insertPanelBlock:
        (options) =>
        ({ commands }) => {
          const blockId =
            options.blockId ||
            (typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : Math.random().toString(36).slice(2));

          return commands.insertContent({
            type: this.name,
            attrs: {
              blockId,
              label: options.label,
              body: options.body ?? "",
              optional: Boolean(options.optional),
            },
          });
        },

      updatePanelBlockBody:
        (blockId, body) =>
        ({ tr, dispatch }) => {
          let found = false;
          tr.doc.descendants((node, pos) => {
            if (node.type.name === "panelBlock" && node.attrs.blockId === blockId) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                body,
              });
              found = true;
              return false; // interrompe a busca
            }
            return true;
          });
          if (found && dispatch) {
            dispatch(tr);
          }
          return found;
        },
    };
  },
});
