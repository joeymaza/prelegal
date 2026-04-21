"use client";

import { Document, Page, Text, StyleSheet, pdf } from "@react-pdf/renderer";
import type { DocFields } from "../lib/doc-types";
import { substituteFields } from "../lib/template-renderer";

const styles = StyleSheet.create({
  page: {
    paddingVertical: 56,
    paddingHorizontal: 64,
    fontSize: 10,
    fontFamily: "Times-Roman",
    lineHeight: 1.5,
    color: "#111",
  },
  h1: { fontSize: 16, fontFamily: "Times-Bold", marginBottom: 12, textAlign: "center" },
  h2: { fontSize: 13, fontFamily: "Times-Bold", marginTop: 14, marginBottom: 6 },
  h3: { fontSize: 11, fontFamily: "Times-Bold", marginTop: 10, marginBottom: 4 },
  h4: { fontSize: 10, fontFamily: "Times-Bold", marginTop: 6, marginBottom: 3 },
  para: { marginBottom: 5, textAlign: "justify" },
  bullet: { marginBottom: 4, marginLeft: 14 },
});

/** Strip HTML tags, keeping inner text. */
function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
}

/**
 * Split a string on **bold** markers and return react-pdf Text children
 * where bold segments use Times-Bold.
 */
function inlineBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <Text key={i} style={{ fontFamily: "Times-Bold" }}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part || undefined;
  });
}

function GenericDocument({
  title,
  markdown,
  fields,
}: {
  title: string;
  markdown: string;
  fields: DocFields;
}) {
  const processed = stripHtml(substituteFields(markdown, fields));
  const lines = processed.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith("#### ")) {
      elements.push(
        <Text key={i} style={styles.h4}>
          {line.slice(5)}
        </Text>,
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <Text key={i} style={styles.h3}>
          {line.slice(4)}
        </Text>,
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <Text key={i} style={styles.h2}>
          {line.slice(3)}
        </Text>,
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <Text key={i} style={styles.h1}>
          {line.slice(2)}
        </Text>,
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <Text key={i} style={styles.bullet}>
          {`\u2022 `}
          {inlineBold(line.slice(2))}
        </Text>,
      );
    } else {
      elements.push(
        <Text key={i} style={styles.para}>
          {inlineBold(line)}
        </Text>,
      );
    }
  }

  return (
    <Document title={title} author="Prelegal">
      <Page size="LETTER" style={styles.page}>
        {elements}
      </Page>
    </Document>
  );
}

export async function buildGenericPdfBlob(
  title: string,
  markdown: string,
  fields: DocFields,
): Promise<Blob> {
  return pdf(<GenericDocument title={title} markdown={markdown} fields={fields} />).toBlob();
}
