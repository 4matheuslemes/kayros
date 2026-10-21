/**
 * Canonical Bible book list for the NWT Portuguese edition.
 * Index corresponds to book_number (1-based).
 */
export const BIBLE_BOOKS = [
  { number: 1,  name: "Gênesis",          abbrev: "Gên." },
  { number: 2,  name: "Êxodo",            abbrev: "Êxo." },
  { number: 3,  name: "Levítico",         abbrev: "Lev." },
  { number: 4,  name: "Números",          abbrev: "Núm." },
  { number: 5,  name: "Deuteronômio",     abbrev: "Deut." },
  { number: 6,  name: "Josué",            abbrev: "Jos." },
  { number: 7,  name: "Juízes",           abbrev: "Juí." },
  { number: 8,  name: "Rute",             abbrev: "Rute" },
  { number: 9,  name: "1 Samuel",         abbrev: "1 Sam." },
  { number: 10, name: "2 Samuel",         abbrev: "2 Sam." },
  { number: 11, name: "1 Reis",           abbrev: "1 Reis" },
  { number: 12, name: "2 Reis",           abbrev: "2 Reis" },
  { number: 13, name: "1 Crônicas",       abbrev: "1 Crô." },
  { number: 14, name: "2 Crônicas",       abbrev: "2 Crô." },
  { number: 15, name: "Esdras",           abbrev: "Esd." },
  { number: 16, name: "Neemias",          abbrev: "Nee." },
  { number: 17, name: "Ester",            abbrev: "Ester" },
  { number: 18, name: "Jó",               abbrev: "Jó" },
  { number: 19, name: "Salmos",           abbrev: "Sal." },
  { number: 20, name: "Provérbios",       abbrev: "Pro." },
  { number: 21, name: "Eclesiastes",      abbrev: "Ecl." },
  { number: 22, name: "Cantares",         abbrev: "Cân." },
  { number: 23, name: "Isaías",           abbrev: "Isa." },
  { number: 24, name: "Jeremias",         abbrev: "Jer." },
  { number: 25, name: "Lamentações",      abbrev: "Lam." },
  { number: 26, name: "Ezequiel",         abbrev: "Eze." },
  { number: 27, name: "Daniel",           abbrev: "Dan." },
  { number: 28, name: "Oseias",           abbrev: "Ose." },
  { number: 29, name: "Joel",             abbrev: "Joel" },
  { number: 30, name: "Amós",             abbrev: "Amós" },
  { number: 31, name: "Obadias",          abbrev: "Obd." },
  { number: 32, name: "Jonas",            abbrev: "Jonas" },
  { number: 33, name: "Miquéias",         abbrev: "Miq." },
  { number: 34, name: "Naum",             abbrev: "Naum" },
  { number: 35, name: "Habacuque",        abbrev: "Hab." },
  { number: 36, name: "Sofonias",         abbrev: "Sof." },
  { number: 37, name: "Ageu",             abbrev: "Ageu" },
  { number: 38, name: "Zacarias",         abbrev: "Zac." },
  { number: 39, name: "Malaquias",        abbrev: "Mal." },
  { number: 40, name: "Mateus",           abbrev: "Mat." },
  { number: 41, name: "Marcos",           abbrev: "Mar." },
  { number: 42, name: "Lucas",            abbrev: "Luc." },
  { number: 43, name: "João",             abbrev: "João" },
  { number: 44, name: "Atos",             abbrev: "Atos" },
  { number: 45, name: "Romanos",          abbrev: "Rom." },
  { number: 46, name: "1 Coríntios",      abbrev: "1 Cor." },
  { number: 47, name: "2 Coríntios",      abbrev: "2 Cor." },
  { number: 48, name: "Gálatas",          abbrev: "Gál." },
  { number: 49, name: "Efésios",          abbrev: "Efé." },
  { number: 50, name: "Filipenses",       abbrev: "Fil." },
  { number: 51, name: "Colossenses",      abbrev: "Col." },
  { number: 52, name: "1 Tessalonicenses",abbrev: "1 Tes." },
  { number: 53, name: "2 Tessalonicenses",abbrev: "2 Tes." },
  { number: 54, name: "1 Timóteo",        abbrev: "1 Tim." },
  { number: 55, name: "2 Timóteo",        abbrev: "2 Tim." },
  { number: 56, name: "Tito",             abbrev: "Tito" },
  { number: 57, name: "Filêmon",          abbrev: "Filêm." },
  { number: 58, name: "Hebreus",          abbrev: "Heb." },
  { number: 59, name: "Tiago",            abbrev: "Tia." },
  { number: 60, name: "1 Pedro",          abbrev: "1 Ped." },
  { number: 61, name: "2 Pedro",          abbrev: "2 Ped." },
  { number: 62, name: "1 João",           abbrev: "1 João" },
  { number: 63, name: "2 João",           abbrev: "2 João" },
  { number: 64, name: "3 João",           abbrev: "3 João" },
  { number: 65, name: "Judas",            abbrev: "Judas" },
  { number: 66, name: "Apocalipse",       abbrev: "Apoc." },
] as const;

export type BibleBook = (typeof BIBLE_BOOKS)[number];

/** Returns full book name from number (1-based). */
export function getBookName(bookNumber: number): string {
  return BIBLE_BOOKS[bookNumber - 1]?.name ?? `Livro ${bookNumber}`;
}

/** Returns book number from partial name match (case-insensitive). */
export function findBookByName(query: string): BibleBook | undefined {
  const q = query.toLowerCase().trim();
  return BIBLE_BOOKS.find(
    (b) =>
      b.name.toLowerCase().startsWith(q) ||
      b.abbrev.toLowerCase().startsWith(q)
  );
}
