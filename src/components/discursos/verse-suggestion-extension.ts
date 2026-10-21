/* eslint-disable @typescript-eslint/no-explicit-any */
import { Extension } from "@tiptap/core";
import Suggestion, { SuggestionOptions } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { VerseSuggestionList, VerseResult } from "./verse-suggestion-list";

/**
 * Ativa o popup flutuante de busca de versículo ao digitar "/".
 * Permite espaços para digitação de referências completas como "João 3:16" ou "Mateus 28:7-9".
 */
export const VerseSuggestion = Extension.create({
  name: "verseSuggestion",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        allowSpaces: true,
        startOfLine: false,

        command: ({ editor, range, props }: any) => {
          const item = props as VerseResult;
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertBibleVerse({
              book: item.book,
              chapter: item.chapter,
              verse: item.verse,
              verseEnd: item.verseEnd,
              text: item.label,
            })
            .insertContent(" ")
            .run();
        },

        render: () => {
          let component: ReactRenderer;
          let popup: TippyInstance[];

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(VerseSuggestionList, {
                props: {
                  query: props.query,
                  command: props.command,
                },
                editor: props.editor,
              });

              if (!props.clientRect) return;

              popup = tippy("body", {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              });
            },

            onUpdate: (props: any) => {
              component.updateProps({
                query: props.query,
                command: props.command,
              });

              if (!props.clientRect) return;

              popup[0]?.setProps({
                getReferenceClientRect: props.clientRect,
              });
            },

            onKeyDown: (props: any) => {
              if (props.event.key === "Escape") {
                popup[0]?.hide();
                return true;
              }
              return (component.ref as any)?.onKeyDown(props) ?? false;
            },

            onExit: () => {
              popup[0]?.destroy();
              component.destroy();
            },
          };
        },
      } as Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
