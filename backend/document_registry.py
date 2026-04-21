"""Document type registry — loads catalog.json, parses template fields, builds per-doc config."""

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

SPAN_RE = re.compile(
    r'<span class="(?:coverpage|keyterms|orderform|businessterms|sow)_link"[^>]*>'
    r"([^<]+)</span>"
)

# Map catalog filename stems to URL-friendly slugs
SLUG_MAP = {
    "Mutual-NDA": "nda",
    "Mutual-NDA-coverpage": "nda-coverpage",
    "CSA": "csa",
    "design-partner-agreement": "design-partner",
    "sla": "sla",
    "psa": "psa",
    "DPA": "dpa",
    "Partnership-Agreement": "partnership",
    "Software-License-Agreement": "software-license",
    "Pilot-Agreement": "pilot",
    "BAA": "baa",
    "AI-Addendum": "ai-addendum",
}

# Party label pairs per doc type (detected from common span patterns)
PARTY_LABELS: dict[str, tuple[str, str]] = {
    "nda": ("Party 1", "Party 2"),
    "csa": ("Provider", "Customer"),
    "design-partner": ("Provider", "Partner"),
    "sla": ("Provider", "Customer"),
    "psa": ("Provider", "Customer"),
    "dpa": ("Provider", "Customer"),
    "partnership": ("Company", "Partner"),
    "software-license": ("Provider", "Customer"),
    "pilot": ("Provider", "Customer"),
    "baa": ("Provider", "Company"),
    "ai-addendum": ("Provider", "Customer"),
}

# NDA fields are hardcoded (come from [bracket] syntax in coverpage, not spans)
NDA_FIELDS = [
    "party1Name",
    "party2Name",
    "purpose",
    "effectiveDate",
    "mndaTermMode",
    "mndaTermYears",
    "confTermMode",
    "confTermYears",
    "governingLawState",
    "jurisdiction",
    "modifications",
]

NDA_SYSTEM_PROMPT = """\
You are a legal assistant helping a user draft a Mutual Non-Disclosure Agreement (NDA).

Your job:
1. Greet the user and ask who the two parties are.
2. Then progressively ask about remaining fields: purpose, effective date, MNDA term, \
confidentiality term, governing law state, jurisdiction, and any modifications.
3. Ask one or two questions at a time. Be conversational but concise.
4. When the user provides information, extract it into the structured fields.
5. Only populate fields you have clear information for. Leave others as null.
6. If a user's answer is ambiguous or incomplete, always ask a follow-up question to clarify before moving on.
7. Once all required fields are filled, summarize what you have and ask if anything needs changes.

Required fields: party1Name, party2Name, effectiveDate, governingLawState, jurisdiction.
Optional fields: purpose, mndaTermMode, mndaTermYears, confTermMode, confTermYears, modifications.

Default values (use if user doesn't specify):
- purpose: "Evaluating whether to enter into a business relationship with the other party."
- mndaTermMode: "expires", mndaTermYears: 1
- confTermMode: "expires", confTermYears: 1
- modifications: "None."

Field formats:
- effectiveDate: YYYY-MM-DD format
- mndaTermMode/confTermMode: exactly "expires" or "perpetual"
- mndaTermYears/confTermYears: integer >= 1, only relevant when mode is "expires"
- governingLawState: US state name (e.g. "Delaware")
- jurisdiction: city/county and state (e.g. "New Castle County, DE")

Today's date is {today}. If the user says "today" for effective date, use {today}.

After all document fields are collected, offer to help fill in the signature block. \
Collect the following for each party (use these exact key names):
- "party1_printName": signatory's full name for Party 1
- "party1_title": signatory's job title for Party 1
- "party1_company": company name for Party 1
- "party1_noticeAddress": postal or email notice address for Party 1
- "party1_signedDate": date of signing for Party 1 (YYYY-MM-DD)
- "party2_printName": signatory's full name for Party 2
- "party2_title": signatory's job title for Party 2
- "party2_company": company name for Party 2
- "party2_noticeAddress": postal or email notice address for Party 2
- "party2_signedDate": date of signing for Party 2 (YYYY-MM-DD)

If the user asks about a document type you cannot help with, explain that this session is \
for drafting a Mutual NDA. Suggest they return to the document picker to choose a different type.

IMPORTANT: Your response must be valid JSON with two fields:
- "reply": your conversational message to the user (string)
- "fields": an object with any document or signature fields you can extract from this turn \
  (use null for unknown fields; include both document fields and party1_/party2_ signature fields)
"""

GENERIC_SYSTEM_PROMPT_TEMPLATE = """\
You are a legal assistant helping a user draft a {doc_name}.

Your job:
1. Greet the user and briefly explain what this document is for.
2. Progressively ask about the fields needed for this document. Ask one or two questions at a time.
3. Be conversational but concise.
4. When the user provides information, extract it into the structured fields.
5. Only populate fields you have clear information for. Leave others as null.
6. If a user's answer is ambiguous or incomplete, always ask a follow-up question to clarify before moving on.
7. Once all key fields are filled, summarize what you have and ask if anything needs changes.

The two parties in this agreement are called "{party1_label}" and "{party2_label}".

Document description: {doc_description}

Fields to collect (use these exact keys in your response):
{field_list}

Today's date is {{today}}. If the user says "today" for any date field, use {{today}}.

After all document fields are collected, offer to help fill in the signature block. \
Collect the following for each party (use these exact key names):
- "party1_printName": signatory's full name for {party1_label}
- "party1_title": signatory's job title for {party1_label}
- "party1_company": company name for {party1_label}
- "party1_noticeAddress": postal or email notice address for {party1_label}
- "party1_signedDate": date of signing for {party1_label} (YYYY-MM-DD)
- "party2_printName": signatory's full name for {party2_label}
- "party2_title": signatory's job title for {party2_label}
- "party2_company": company name for {party2_label}
- "party2_noticeAddress": postal or email notice address for {party2_label}
- "party2_signedDate": date of signing for {party2_label} (YYYY-MM-DD)

If the user asks about a document type you cannot help with, explain that this session is \
for drafting a {doc_name}. List the following supported document types and suggest they return \
to the document picker to choose one: Mutual NDA, Cloud Service Agreement, Design Partner \
Agreement, SLA, Professional Services Agreement, DPA, Partnership Agreement, Software License \
Agreement, Pilot Agreement, Business Associate Agreement, AI Addendum.

IMPORTANT: Your response must be valid JSON with two fields:
- "reply": your conversational message to the user (string)
- "fields": an object with any document or signature fields you can extract from this turn \
  (use null for unknown fields; include both document fields and party1_/party2_ signature fields)
"""


@dataclass
class DocTypeConfig:
    doc_type: str
    name: str
    description: str
    template_file: str
    party1_label: str
    party2_label: str
    field_names: list[str]
    system_prompt: str
    greeting: str = ""


def _extract_span_fields(markdown: str) -> list[str]:
    """Extract unique field names from span link tags in template markdown."""
    raw = SPAN_RE.findall(markdown)
    # Strip possessives and deduplicate
    cleaned = set()
    for name in raw:
        name = name.strip()
        if name.endswith("'s"):
            name = name[:-2]
        cleaned.add(name)
    # Remove pure structural/header spans and party role names that aren't fields
    return sorted(cleaned)


def _build_generic_prompt(
    doc_name: str,
    doc_description: str,
    party1_label: str,
    party2_label: str,
    field_names: list[str],
) -> str:
    field_list = "\n".join(f'- "{f}"' for f in field_names)
    prompt = GENERIC_SYSTEM_PROMPT_TEMPLATE.format(
        doc_name=doc_name,
        doc_description=doc_description,
        party1_label=party1_label,
        party2_label=party2_label,
        field_list=field_list,
    )
    return prompt


def _build_greeting(doc_name: str) -> str:
    return f"Hi! I'll help you draft your {doc_name}. Let's start -- who are the two parties involved?"


def _load_registry() -> dict[str, DocTypeConfig]:
    catalog_path = PROJECT_ROOT / "catalog.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))

    registry: dict[str, DocTypeConfig] = {}

    for entry in catalog["templates"]:
        filename = entry["filename"]
        stem = Path(filename).stem
        slug = SLUG_MAP.get(stem)
        if slug is None or slug == "nda-coverpage":
            continue  # skip coverpage (it's part of nda) and unknown stems

        template_path = PROJECT_ROOT / filename
        template_text = template_path.read_text(encoding="utf-8") if template_path.exists() else ""

        labels = PARTY_LABELS.get(slug, ("Party 1", "Party 2"))

        if slug == "nda":
            field_names = NDA_FIELDS
            system_prompt = NDA_SYSTEM_PROMPT
        else:
            field_names = _extract_span_fields(template_text)
            system_prompt = _build_generic_prompt(
                doc_name=entry["name"],
                doc_description=entry["description"],
                party1_label=labels[0],
                party2_label=labels[1],
                field_names=field_names,
            )

        config = DocTypeConfig(
            doc_type=slug,
            name=entry["name"],
            description=entry["description"],
            template_file=filename,
            party1_label=labels[0],
            party2_label=labels[1],
            field_names=field_names,
            system_prompt=system_prompt,
            greeting=_build_greeting(entry["name"]),
        )
        registry[slug] = config

    return registry


REGISTRY: dict[str, DocTypeConfig] = _load_registry()


def get_doc_config(doc_type: str) -> DocTypeConfig:
    """Look up a document type config. Raises KeyError if not found."""
    return REGISTRY[doc_type]
