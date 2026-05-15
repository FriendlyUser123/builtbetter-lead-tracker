import { isValid, parseISO } from "date-fns";
import { leadSchema } from "@/lib/validation";

function cleanOptional(value: string | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function parseOptionalDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

export function readLeadFormData(formData: FormData) {
  const parsed = leadSchema.parse({
    business: String(formData.get("business") ?? ""),
    niche: String(formData.get("niche") ?? ""),
    city: String(formData.get("city") ?? ""),
    website: String(formData.get("website") ?? ""),
    email: String(formData.get("email") ?? ""),
    phoneNumber: String(formData.get("phoneNumber") ?? ""),
    issueFound: String(formData.get("issueFound") ?? ""),
    priority: String(formData.get("priority") || "MEDIUM"),
    contacted: formData.get("contacted") === "on",
    followUpDate: String(formData.get("followUpDate") ?? ""),
    googleMaps: String(formData.get("googleMaps") ?? ""),
    sourceLinks: String(formData.get("sourceLinks") ?? ""),
    rawResearchText: String(formData.get("rawResearchText") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    status: String(formData.get("status") || "NEW"),
  });

  return {
    business: parsed.business,
    niche: cleanOptional(parsed.niche),
    city: cleanOptional(parsed.city),
    website: cleanOptional(parsed.website),
    email: cleanOptional(parsed.email),
    phoneNumber: cleanOptional(parsed.phoneNumber),
    issueFound: cleanOptional(parsed.issueFound),
    priority: parsed.priority,
    contacted: parsed.contacted,
    followUpDate: parseOptionalDate(parsed.followUpDate),
    googleMaps: cleanOptional(parsed.googleMaps),
    sourceLinks: cleanOptional(parsed.sourceLinks),
    rawResearchText: cleanOptional(parsed.rawResearchText),
    notes: cleanOptional(parsed.notes),
    status: parsed.status,
  };
}
