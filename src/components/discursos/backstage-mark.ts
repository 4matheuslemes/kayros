import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    backstage: {
      /** Aplica ou remove a marca de "Nota de Bastidor" no texto selecionado */
      toggleBackstage: () => ReturnType;
    };
  }
}

/**
 * Mark de "Nota de Bastidor".
 * Marca anotações internas do pregador.
 * Serializado como <span data-backstage="true"> no HTML e { type: "backstage" } no JSON.
 */
export const BackstageMark = Mark.create({
  name: "backstage",

  parseHTML() {
    return [
      {
        tag: "span[data-backstage]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-backstage": "true",
        class: "backstage-mark",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleBackstage:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-b": () => this.editor.commands.toggleBackstage(),
    };
  },
});
