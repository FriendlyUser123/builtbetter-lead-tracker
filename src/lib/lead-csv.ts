import type { Lead } from "@prisma/client";
import { leadPriorityLabels, leadStatusLabels } from "@/lib/validation";

export const readableCsvHeaders = [
  "Business",
  "Niche",
  "City",
  "Website",
  "Email",
  "Phone Number",
  "Issue Found",
  "Priority",
  "Contacted?",
  "Follow-up Date",
  "Google Maps?",
  "Source Links",
  "Raw Research Text",
  "Notes",
  "Status",
  "Created At",
  "Updated At",
] as const;

export function formatPhoneForCsv(phoneNumber: string | null) {
  const cleaned = phoneNumber?.trim();

  if (!cleaned) {
    return "";
  }

  const digits = cleaned.replace(/\D/g, "");
  const display =
    digits.length === 10
      ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
      : cleaned;

  const escaped = display.replaceAll('"', '""');

  return `="${escaped}"`;
}

export function mapLeadToCsvRow(lead: Lead) {
  return {
    Business: lead.business,
    Niche: lead.niche ?? "",
    City: lead.city ?? "",
    Website: lead.website ?? "",
    Email: lead.email ?? "",
    "Phone Number": formatPhoneForCsv(lead.phoneNumber),
    "Issue Found": lead.issueFound ?? "",
    Priority: leadPriorityLabels[lead.priority],
    "Contacted?": lead.contacted ? "Yes" : "No",
    "Follow-up Date": lead.followUpDate?.toISOString().slice(0, 10) ?? "",
    "Google Maps?": lead.googleMaps ?? "",
    "Source Links": lead.sourceLinks ?? "",
    "Raw Research Text": lead.rawResearchText ?? "",
    Notes: lead.notes ?? "",
    Status: leadStatusLabels[lead.status],
    "Created At": lead.createdAt.toISOString(),
    "Updated At": lead.updatedAt.toISOString(),
  };
}

export function normalizeCsvHeaderForImport(header: string) {
  const normalized = header
    .trim()
    .toLowerCase()
    .replace(/\?/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ");

  const headerMap: Record<string, string> = {
    business: "business",
    niche: "niche",
    city: "city",
    website: "website",
    email: "email",
    "phone number": "phoneNumber",
    phonenumber: "phoneNumber",
    phone: "phoneNumber",
    "issue found": "issueFound",
    issuefound: "issueFound",
    priority: "priority",
    contacted: "contacted",
    "follow up date": "followUpDate",
    "followup date": "followUpDate",
    followupdate: "followUpDate",
    "google maps": "googleMaps",
    googlemaps: "googleMaps",
    "source links": "sourceLinks",
    sourcelinks: "sourceLinks",
    "raw research text": "rawResearchText",
    rawresearchtext: "rawResearchText",
    research: "rawResearchText",
    notes: "notes",
    status: "status",
    "created at": "createdAt",
    createdat: "createdAt",
    "updated at": "updatedAt",
    updatedat: "updatedAt",
  };

  return headerMap[normalized] ?? header;
}

export function cleanImportedPhoneNumber(value: string | undefined) {
  const cleaned = value?.trim();

  if (!cleaned) {
    return cleaned;
  }

  const formulaText = cleaned.match(/^="(.*)"$/);
  return formulaText?.[1]?.replaceAll('""', '"') ?? cleaned;
}
