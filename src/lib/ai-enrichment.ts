export type AiConfidence = "high" | "medium" | "low";

export type AiSuggestionField = {
  value: string;
  confidence: AiConfidence;
  reason: string;
};

export type AiLeadSuggestions = {
  business: AiSuggestionField;
  niche: AiSuggestionField;
  city: AiSuggestionField;
  website: AiSuggestionField;
  email: AiSuggestionField;
  phoneNumber: AiSuggestionField;
  googleMaps: AiSuggestionField;
  issueFound: AiSuggestionField;
  priority: AiSuggestionField;
  warnings: string[];
};

export const aiSuggestionLabels: Record<keyof Omit<AiLeadSuggestions, "warnings">, string> = {
  business: "Business",
  niche: "Niche",
  city: "City",
  website: "Website",
  email: "Email",
  phoneNumber: "Phone Number",
  googleMaps: "Google Maps",
  issueFound: "Issue Found",
  priority: "Priority",
};

export function normalizeAiPriority(value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized === "high") return "HIGH";
  if (normalized === "low") return "LOW";

  return "MEDIUM";
}
