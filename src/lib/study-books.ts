export interface StudyUnit {
  id: string;      // ex: "licao-5", "revisao-parte-1"
  label: string;    // ex: "Lição 5", "Revisão — Parte 1"
  part: number;
}

export interface StudyBook {
  id: string;
  title: string;
  units: StudyUnit[];
}

function buildSejaFelizUnits(): StudyUnit[] {
  const parts = [
    { part: 1, start: 1, end: 12 },
    { part: 2, start: 13, end: 33 },
    { part: 3, start: 34, end: 47 },
    { part: 4, start: 48, end: 60 },
  ];
  
  const units: StudyUnit[] = [];
  
  for (const p of parts) {
    for (let n = p.start; n <= p.end; n++) {
      units.push({ id: `licao-${n}`, label: `Lição ${n}`, part: p.part });
    }
    units.push({ id: `revisao-parte-${p.part}`, label: `Revisão — Parte ${p.part}`, part: p.part });
  }
  
  return units;
}

export const STUDY_BOOKS: StudyBook[] = [
  {
    id: "seja-feliz-para-sempre",
    title: "Seja Feliz para Sempre! — Um Curso da Bíblia Para Você",
    units: buildSejaFelizUnits(),
  },
];

export function getNextUnit(bookId: string, currentUnitId: string | null): StudyUnit | null {
  const book = STUDY_BOOKS.find((b) => b.id === bookId);
  if (!book) return null;
  
  if (!currentUnitId) return book.units[0] ?? null;
  
  const idx = book.units.findIndex((u) => u.id === currentUnitId);
  if (idx === -1 || idx === book.units.length - 1) return null;
  
  return book.units[idx + 1];
}
