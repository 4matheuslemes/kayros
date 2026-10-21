import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import {
  joinVerseText,
  type ExportBlock,
  type ExportInline,
  type VerseRef,
  type VerseTextMap,
} from "@/lib/discursos/outline-export";

/*
 * Fontes: usamos a Times (embutida no PDF, sem rede e sem arquivos extras) como
 * serifada de fallback — cobre todos os acentos do português.
 */

// A hifenização padrão é inglesa e quebra palavras em português de forma estranha.
// Devolver a palavra inteira desliga a hifenização automática.
Font.registerHyphenationCallback((word) => [word]);

const INK = "#1B2433";
const MUTED = "#6B7380";
const VERSE_ACCENT = "#8B4A52"; // mesma cor de --verse-accent do Kairós
const RULE = "#D9D5CC";

const styles = StyleSheet.create({
  page: {
    paddingTop: 64,
    paddingBottom: 72,
    paddingHorizontal: 68,
    fontFamily: "Times-Roman",
    fontSize: 12.5,
    lineHeight: 1.55,
    color: INK,
  },
  title: {
    fontFamily: "Times-Bold",
    fontSize: 24,
    lineHeight: 1.2,
    marginBottom: 6,
  },
  category: {
    fontFamily: "Times-Italic",
    fontSize: 11,
    color: MUTED,
    marginBottom: 14,
  },
  titleRule: {
    borderBottomWidth: 1,
    borderBottomColor: VERSE_ACCENT,
    marginBottom: 20,
  },
  h1: { fontFamily: "Times-Bold", fontSize: 18, marginTop: 16, marginBottom: 6 },
  h2: { fontFamily: "Times-Bold", fontSize: 15, marginTop: 13, marginBottom: 5 },
  h3: { fontFamily: "Times-Bold", fontSize: 13, marginTop: 10, marginBottom: 4 },
  paragraph: { marginBottom: 8 },
  listItem: { flexDirection: "row", marginBottom: 3 },
  marker: { width: 20 },
  listBody: { flex: 1 },
  quote: {
    borderLeftWidth: 2,
    borderLeftColor: RULE,
    paddingLeft: 12,
    marginBottom: 8,
    color: MUTED,
  },
  code: { fontFamily: "Courier", fontSize: 10.5, marginBottom: 8 },
  rule: { borderBottomWidth: 0.75, borderBottomColor: RULE, marginVertical: 10 },
  verseBox: {
    borderLeftWidth: 2.5,
    borderLeftColor: VERSE_ACCENT,
    paddingLeft: 12,
    paddingVertical: 2,
    marginLeft: 6,
    marginBottom: 8,
  },
  verseLabel: { fontFamily: "Times-Bold", color: VERSE_ACCENT, fontSize: 11.5 },
  verseText: { fontFamily: "Times-Italic", fontSize: 12 },
  footer: {
    position: "absolute",
    bottom: 34,
    left: 68,
    right: 68,
    flexDirection: "row",
    justifyContent: "space-between",
    fontFamily: "Times-Italic",
    fontSize: 9,
    color: MUTED,
  },
});

function family(i: ExportInline): string {
  if (i.bold && i.italic) return "Times-BoldItalic";
  if (i.bold) return "Times-Bold";
  if (i.italic || i.backstage) return "Times-Italic";
  return "Times-Roman";
}

function Inlines({ inlines }: { inlines: ExportInline[] }) {
  return (
    <>
      {inlines.map((i, idx) => (
        <Text
          key={idx}
          style={{
            fontFamily: family(i),
            textDecoration: i.underline ? "underline" : "none",
            color: i.verse ? VERSE_ACCENT : i.backstage ? MUTED : undefined,
          }}
        >
          {i.text}
        </Text>
      ))}
    </>
  );
}

function VerseBoxes({ verses, texts }: { verses: VerseRef[]; texts: VerseTextMap }) {
  return (
    <>
      {verses.map((ref) => {
        const vt = texts.get(ref.key);
        return (
          <View key={ref.key} style={styles.verseBox} wrap={false}>
            <Text>
              <Text style={styles.verseLabel}>{ref.label}</Text>
              {vt ? (
                <Text style={styles.verseText}>{`  “${joinVerseText(vt)}”`}</Text>
              ) : null}
            </Text>
          </View>
        );
      })}
    </>
  );
}

function Blocks({ blocks, texts }: { blocks: ExportBlock[]; texts: VerseTextMap }) {
  return (
    <>
      {blocks.map((b, idx) => {
        switch (b.type) {
          case "heading": {
            const style = b.level === 1 ? styles.h1 : b.level === 2 ? styles.h2 : styles.h3;
            return (
              <View key={idx}>
                <Text style={style} minPresenceAhead={40}>
                  <Inlines inlines={b.inlines.map((i) => ({ ...i, bold: true }))} />
                </Text>
                <VerseBoxes verses={b.verses} texts={texts} />
              </View>
            );
          }
          case "paragraph":
            return (
              <View key={idx}>
                <Text style={styles.paragraph}>
                  <Inlines inlines={b.inlines} />
                </Text>
                <VerseBoxes verses={b.verses} texts={texts} />
              </View>
            );
          case "list":
            return (
              <View key={idx} style={{ marginBottom: 6 }}>
                {b.items.map((item, n) => (
                  <View key={n} style={styles.listItem}>
                    <Text style={styles.marker}>
                      {b.ordered ? `${b.start + n}.` : "•"}
                    </Text>
                    <View style={styles.listBody}>
                      <Blocks blocks={item} texts={texts} />
                    </View>
                  </View>
                ))}
              </View>
            );
          case "blockquote":
            return (
              <View key={idx} style={styles.quote}>
                <Blocks blocks={b.blocks} texts={texts} />
              </View>
            );
          case "code":
            return (
              <Text key={idx} style={styles.code}>
                {b.text}
              </Text>
            );
          case "rule":
            return <View key={idx} style={styles.rule} />;
        }
      })}
    </>
  );
}

export function OutlinePdf({
  title,
  category,
  blocks,
  texts,
}: {
  title: string;
  category: string;
  blocks: ExportBlock[];
  texts: VerseTextMap;
}) {
  return (
    <Document title={title} author="Kairós" creator="Kairós" producer="Kairós">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        {category ? <Text style={styles.category}>{category}</Text> : null}
        <View style={styles.titleRule} />

        <Blocks blocks={blocks} texts={texts} />

        <View style={styles.footer} fixed>
          <Text>Kairós</Text>
          <Text
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
