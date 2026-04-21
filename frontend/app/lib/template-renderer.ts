import type { DocFields } from "./doc-types";

const SPAN_RE =
  /<span class="(?:coverpage|keyterms|orderform|businessterms|sow)_link"[^>]*>([^<]+)<\/span>/g;

/**
 * Replace all span-link placeholders in template markdown with field values.
 * Unmatched fields show as bold placeholders like **[Field Name]**.
 */
export function substituteFields(markdown: string, fields: DocFields): string {
  return markdown.replace(SPAN_RE, (_match, name: string) => {
    // Handle possessives: "Customer's" -> look up "Customer" and re-add "'s"
    let suffix = "";
    let lookupName = name.trim();
    if (lookupName.endsWith("'s")) {
      lookupName = lookupName.slice(0, -2);
      suffix = "'s";
    }
    const value = fields[lookupName];
    if (value) {
      return `**${value}${suffix}**`;
    }
    return `**[${lookupName}]${suffix}**`;
  });
}

/**
 * Extract unique field names from span-link tags in template markdown.
 */
export function extractFieldNames(markdown: string): string[] {
  const names = new Set<string>();
  let match;
  const re = new RegExp(SPAN_RE.source, "g");
  while ((match = re.exec(markdown)) !== null) {
    let name = match[1].trim();
    if (name.endsWith("'s")) name = name.slice(0, -2);
    names.add(name);
  }
  return Array.from(names).sort();
}
