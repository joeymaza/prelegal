"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import {
  deriveNdaFields,
  SIGNATURE_ROWS,
  STANDARD_CLAUSES,
  type NdaFormData,
} from "./nda-template";

const styles = StyleSheet.create({
  page: { paddingVertical: 56, paddingHorizontal: 64, fontSize: 10.5, fontFamily: "Times-Roman", lineHeight: 1.45, color: "#111" },
  h1: { fontSize: 18, fontFamily: "Times-Bold", marginBottom: 14, textAlign: "center" },
  h2: { fontSize: 13, fontFamily: "Times-Bold", marginTop: 14, marginBottom: 8 },
  intro: { marginBottom: 12 },
  field: { marginBottom: 6 },
  fieldLabel: { fontFamily: "Times-Bold" },
  rule: { marginVertical: 14, borderBottomWidth: 1, borderBottomColor: "#999" },
  clause: { marginBottom: 8, textAlign: "justify" },
  clauseLead: { fontFamily: "Times-Bold" },
  table: { marginTop: 10, borderStyle: "solid", borderWidth: 1, borderColor: "#999" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#999" },
  rowLast: { flexDirection: "row" },
  cellHeader: { flex: 1, padding: 5, fontFamily: "Times-Bold", borderRightWidth: 1, borderRightColor: "#999" },
  cell: { flex: 1, padding: 5, minHeight: 22, borderRightWidth: 1, borderRightColor: "#999" },
  cellLast: { flex: 1, padding: 5, minHeight: 22 },
  footer: { marginTop: 18, fontSize: 8, color: "#555", textAlign: "center" },
});

function NdaDocument({ data }: { data: NdaFormData }) {
  const derived = deriveNdaFields(data);
  const { p1, p2, law, jur, purpose, effective, mndaTerm, confTerm, modifications } = derived;

  return (
    <Document title={`Mutual NDA — ${p1} & ${p2}`} author="Prelegal">
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h1}>Mutual Non-Disclosure Agreement</Text>
        <Text style={styles.intro}>
          This Mutual Non-Disclosure Agreement (the "MNDA") is entered into between {p1} and {p2} (each a "Party") and consists of this Cover Page and the Common Paper Mutual NDA Standard Terms Version 1.0 ("Standard Terms"), identical to those posted at https://commonpaper.com/standards/mutual-nda/1.0.
        </Text>

        <Text style={styles.h2}>Cover Page</Text>
        <Text style={styles.field}><Text style={styles.fieldLabel}>Purpose. </Text>{purpose}</Text>
        <Text style={styles.field}><Text style={styles.fieldLabel}>Effective Date. </Text>{effective}</Text>
        <Text style={styles.field}><Text style={styles.fieldLabel}>MNDA Term. </Text>{mndaTerm}</Text>
        <Text style={styles.field}><Text style={styles.fieldLabel}>Term of Confidentiality. </Text>{confTerm}</Text>
        <Text style={styles.field}><Text style={styles.fieldLabel}>Governing Law. </Text>State of {law}.</Text>
        <Text style={styles.field}><Text style={styles.fieldLabel}>Jurisdiction. </Text>Courts located in {jur}.</Text>
        <Text style={styles.field}><Text style={styles.fieldLabel}>MNDA Modifications. </Text>{modifications}</Text>

        <Text style={{ marginTop: 10 }}>
          By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.
        </Text>

        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={styles.cellHeader}> </Text>
            <Text style={styles.cellHeader}>{p1}</Text>
            <Text style={[styles.cellHeader, { borderRightWidth: 0 }]}>{p2}</Text>
          </View>
          {SIGNATURE_ROWS.map((label, i) => {
            const isLast = i === SIGNATURE_ROWS.length - 1;
            return (
              <View key={label} style={isLast ? styles.rowLast : styles.row}>
                <Text style={styles.cell}>{label}</Text>
                <Text style={styles.cell}> </Text>
                <Text style={styles.cellLast}> </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.rule} />

        <Text style={styles.h2}>Standard Terms</Text>
        {STANDARD_CLAUSES.map((c, i) => (
          <Text key={c.title} style={styles.clause}>
            {i + 1}. <Text style={styles.clauseLead}>{c.title} </Text>
            {c.body(derived)}
          </Text>
        ))}

        <Text style={styles.footer}>
          Based on the Common Paper Mutual Non-Disclosure Agreement (Version 1.0), free to use under CC BY 4.0.
        </Text>
      </Page>
    </Document>
  );
}

export async function buildNdaPdfBlob(data: NdaFormData): Promise<Blob> {
  return pdf(<NdaDocument data={data} />).toBlob();
}
