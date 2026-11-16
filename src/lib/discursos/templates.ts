import type { JSONContent } from "@tiptap/core";
import type { OutlineCategory } from "./outline-utils";

export interface OutlineTemplate {
  id: string;
  name: string;
  description: string;
  title: string;
  category: OutlineCategory;
  doc: JSONContent;
}

// ============================================================
// FUNÇÕES AUXILIARES DE CONSTRUÇÃO DE NÓS TIPTAP / PROSEMIRROR
// ============================================================

export function heading(level: 1 | 2 | 3, text: string): JSONContent {
  return {
    type: "heading",
    attrs: { level },
    content: text ? [{ type: "text", text }] : [],
  };
}

export function paragraph(text: string): JSONContent {
  return {
    type: "paragraph",
    content: text ? [{ type: "text", text }] : [],
  };
}

export function bullets(items: string[]): JSONContent {
  return {
    type: "bulletList",
    content: items.map((item) => ({
      type: "listItem",
      content: [paragraph(item)],
    })),
  };
}

export function tasks(items: (string | { text: string; checked?: boolean })[]): JSONContent {
  return {
    type: "taskList",
    content: items.map((item) => {
      const text = typeof item === "string" ? item : item.text;
      const checked = typeof item === "string" ? false : Boolean(item.checked);
      return {
        type: "taskItem",
        attrs: { checked },
        content: [paragraph(text)],
      };
    }),
  };
}

// ============================================================
// MODELO: PRESIDENTE — REUNIÃO VIDA E MINISTÉRIO
// ============================================================

const presidenteVidaMinisterioDoc: JSONContent = {
  type: "doc",
  content: [
    heading(1, "Presidente — Reunião Vida e Ministério"),
    paragraph("Data: ____ · Início: __:__ · Término previsto (início + 1h45): __:__"),
    paragraph("Leitura da Bíblia da semana: ____"),
    paragraph("Cântico inicial nº ___ · Oração inicial: ____"),
    paragraph("Cântico do meio nº ___ · Cântico final nº ___ · Oração final: ____"),

    heading(2, "Antes da reunião"),
    tasks([
      "Conferir a programação da Apostila e quem tem cada parte",
      "Conferir que a programação completa está no quadro de anúncios",
      "Combinar som e vídeos (JW Library) com os irmãos responsáveis",
      "Salas adicionais? Quem dirige cada uma: ____",
      "Semana especial? Visita do superintendente de circuito (ver no final). Assembleia ou Celebração: sem reunião",
      "Comentários iniciais e finais preparados",
      "Anúncios ou cartas a ler: ____",
    ]),

    heading(2, "Comentários iniciais (1 min)"),
    paragraph("Depois do cântico e da oração iniciais."),
    tasks([
      "Criar expectativa sobre o que será considerado",
      "Destacar o ponto de maior benefício para a congregação: ____",
    ]),
    paragraph("Meus pontos: ____"),

    heading(2, "Tesouros da Palavra de Deus"),
    paragraph("Anunciar cada parte. Comentários entre as partes bem breves."),
    heading(3, "Discurso (10 min) — ____ — Tema: ____"),
    tasks(["Livro novo da Bíblia na semana? Tem vídeo de apresentação"]),
    heading(3, "Joias espirituais (10 min) — ____"),
    tasks(["Se houver salas adicionais: convidar os estudantes a irem agora"]),
    heading(3, "Leitura da Bíblia (4 min) — Estudante: ____ — Texto: ____"),
    tasks(["Elogios e conselho (1 min). Lição designada: ____"]),
    paragraph("Elogio sincero: ____"),
    paragraph("Ponto de conselho: ____"),

    heading(2, "Faça Seu Melhor no Ministério (15 min)"),
    heading(3, "Parte 1: ____ — Estudante: ____ / Ajudante: ____ — Cena: ____ — Lição: ____"),
    tasks(["Elogios e conselho (1 min)"]),
    paragraph("Elogio: ____ · Conselho: ____"),
    heading(3, "Parte 2: ____ — Estudante: ____ / Ajudante: ____ — Cena: ____ — Lição: ____"),
    tasks(["Elogios e conselho (1 min)"]),
    paragraph("Elogio: ____ · Conselho: ____"),
    heading(3, "Parte 3: ____ — Estudante: ____ / Ajudante: ____ — Cena: ____ — Lição: ____"),
    tasks(["Elogios e conselho (1 min)"]),
    paragraph("Elogio: ____ · Conselho: ____"),
    heading(3, "Parte 4: ____ — Estudante: ____ / Ajudante: ____ — Cena: ____ — Lição: ____"),
    tasks(["Elogios e conselho (1 min)"]),
    paragraph("Elogio: ____ · Conselho: ____"),
    paragraph("Lembretes sobre elogios e conselhos:"),
    bullets([
      "Não anunciar a lição antes da parte",
      "Começar com um elogio sincero. Depois dizer qual era a lição e por que foi bem, ou sugerir com bondade rever a lição e como",
      "Conselhos mais longos: em particular, depois da reunião",
    ]),
    tasks(["Se houver salas adicionais: chamar os estudantes de volta depois da última designação"]),

    heading(2, "Nossa Vida Cristã"),
    tasks(["Cântico nº ___"]),
    heading(3, "Parte 1 (___ min) — ____"),
    heading(3, "Parte 2 (___ min) — ____"),
    paragraph("Necessidades locais: só anciãos."),
    heading(3, "Estudo Bíblico de Congregação (30 min) — Dirigente: ____ · Leitor: ____"),
    paragraph("Matéria: ____"),
    tasks(["Tempo apertado? Pedir ao dirigente para reduzir, por exemplo não lendo alguns parágrafos"]),

    heading(2, "Comentários finais (3 min)"),
    tasks([
      "Revisar os pontos práticos (ou pedir comentários sobre o que foi mais útil, se o tempo permitir)",
      "Visão geral da próxima semana",
      "Nomes dos estudantes da próxima semana, se sobrar tempo",
      "Anúncios e cartas aqui. Informações de rotina vão para o quadro de anúncios, não para o palco",
      "Se faltar tempo para os anúncios: pedir que as partes de Nossa Vida Cristã sejam reduzidas",
      "Cântico final nº ___ e oração: ____",
    ]),

    heading(2, "Controle do tempo"),
    bullets([
      "A reunião inteira, com cânticos e orações, dura 1 h 45",
      "Nenhuma parte passa do tempo, nem os meus comentários",
      "Quem passar do tempo é aconselhado em particular por mim ou pelo conselheiro assistente",
      "Dicas: comentários entre as partes bem breves; microfone de pedestal (se houver espaço) enquanto o próximo irmão vai à tribuna; posso ficar sentado no palco na Leitura da Bíblia e em Faça Seu Melhor para economizar tempo",
    ]),
    tasks(["Hora real de término: __:__"]),

    heading(2, "Semana da visita do superintendente de circuito"),
    bullets([
      "O Estudo Bíblico de Congregação é substituído pelo discurso de serviço de 30 min do superintendente",
      "Antes do discurso: revisão do que foi considerado, visão da reunião da semana seguinte, anúncios e cartas. Depois, anunciar o superintendente",
      "Não há partes de estudante em salas adicionais",
      "O superintendente escolhe o cântico final e pode convidar alguém para a oração",
    ]),
  ],
};

export const OUTLINE_TEMPLATES: OutlineTemplate[] = [
  {
    id: "presidente-vida-ministerio",
    name: "Presidente — Reunião Vida e Ministério",
    description:
      "Roteiro completo com checklist para conduzir a reunião, anunciar partes, dar elogios e conselhos e controlar o tempo.",
    title: "Presidente — Reunião Vida e Ministério",
    category: "Presidente da reunião",
    doc: presidenteVidaMinisterioDoc,
  },
];

/** Retorna uma cópia profunda do documento do modelo para edição independente. */
export function cloneTemplateDoc(template: OutlineTemplate): JSONContent {
  return JSON.parse(JSON.stringify(template.doc));
}
