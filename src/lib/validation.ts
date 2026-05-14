import { z } from "zod";

export const leadStatusValues = [
  "NEW",
  "RESEARCHING",
  "READY_TO_CONTACT",
  "CONTACTED",
  "FOLLOW_UP",
  "REPLIED",
  "INTERESTED",
  "CLOSED",
  "NOT_INTERESTED",
] as const;

export const leadPriorityValues = ["HIGH", "MEDIUM", "LOW"] as const;

export const leadStatusLabels: Record<(typeof leadStatusValues)[number], string> = {
  NEW: "New",
  RESEARCHING: "Researching",
  READY_TO_CONTACT: "Ready to Contact",
  CONTACTED: "Contacted",
  FOLLOW_UP: "Follow Up",
  REPLIED: "Replied",
  INTERESTED: "Interested",
  CLOSED: "Closed",
  NOT_INTERESTED: "Not Interested",
};

export const leadPriorityLabels: Record<
  (typeof leadPriorityValues)[number],
  string
> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

const optionalText = z.string().trim().optional();

export const leadSchema = z.object({
  business: z.string().trim().min(1, "Business is required"),
  niche: optionalText,
  city: optionalText,
  website: optionalText,
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  phoneNumber: optionalText,
  issueFound: optionalText,
  priority: z.enum(leadPriorityValues),
  contacted: z.boolean(),
  followUpDate: optionalText,
  googleMaps: optionalText,
  sourceLinks: optionalText,
  notes: optionalText,
  status: z.enum(leadStatusValues),
});

export type LeadInput = z.infer<typeof leadSchema>;
