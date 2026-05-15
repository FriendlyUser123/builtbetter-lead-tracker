"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addDays, isValid, parseISO } from "date-fns";
import { getPrisma } from "@/lib/prisma";
import { readLeadFormData } from "@/lib/lead-form";
import {
  leadPriorityLabels,
  leadPriorityValues,
  leadStatusLabels,
  leadStatusValues,
} from "@/lib/validation";
import { cleanImportedPhoneNumber } from "@/lib/lead-csv";

async function findDuplicateLeadId({
  business,
  phoneNumber,
  website,
}: {
  business: string;
  phoneNumber?: string | null;
  website?: string | null;
}) {
  const duplicateChecks: Array<{
    business: string;
    phoneNumber?: string;
    website?: string;
  }> = [];

  if (phoneNumber) {
    duplicateChecks.push({ business, phoneNumber });
  }

  if (website) {
    duplicateChecks.push({ business, website });
  }

  if (duplicateChecks.length === 0) {
    return null;
  }

  const prisma = getPrisma();
  const duplicate = await prisma.lead.findFirst({
    where: { OR: duplicateChecks },
    select: { id: true },
  });

  return duplicate?.id ?? null;
}

export async function createLeadAction(formData: FormData) {
  const prisma = getPrisma();
  const data = readLeadFormData(formData);
  const duplicateId = await findDuplicateLeadId({
    business: data.business,
    phoneNumber: data.phoneNumber,
    website: data.website,
  });

  if (duplicateId) {
    redirect(`/leads/${duplicateId}`);
  }

  await prisma.lead.create({ data });

  revalidatePath("/");
  redirect("/");
}

export async function updateLeadAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    throw new Error("Lead id is required.");
  }

  const prisma = getPrisma();
  const data = readLeadFormData(formData);

  try {
    await prisma.lead.update({
      where: { id },
      data,
    });
  } catch {
    throw new Error("Could not update this lead. It may have been deleted.");
  }

  revalidatePath("/");
  revalidatePath(`/leads/${id}`);
  redirect("/");
}

export async function deleteLeadAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    throw new Error("Lead id is required.");
  }

  const prisma = getPrisma();

  await prisma.lead.delete({
    where: { id },
  }).catch(() => null);

  revalidatePath("/");
  redirect("/");
}

export async function markLeadContactedAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    throw new Error("Lead id is required.");
  }

  const prisma = getPrisma();

  await prisma.lead.update({
    where: { id },
    data: {
      contacted: true,
      status: "CONTACTED",
    },
  }).catch(() => null);

  revalidatePath("/");
  revalidatePath("/follow-ups");
  revalidatePath(`/leads/${id}`);
}

export async function markLeadNotContactedAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    throw new Error("Lead id is required.");
  }

  const prisma = getPrisma();

  await prisma.lead.update({
    where: { id },
    data: {
      contacted: false,
    },
  }).catch(() => null);

  revalidatePath("/");
  revalidatePath("/follow-ups");
  revalidatePath(`/leads/${id}`);
}

export async function pushFollowUpAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const days = Number(formData.get("days") ?? 7);

  if (!id) {
    throw new Error("Lead id is required.");
  }

  const prisma = getPrisma();
  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { followUpDate: true },
  });

  if (!lead) {
    revalidatePath("/");
    revalidatePath("/follow-ups");
    return;
  }

  await prisma.lead.update({
    where: { id },
    data: {
      followUpDate: addDays(new Date(), Number.isFinite(days) ? days : 7),
      status: "FOLLOW_UP",
    },
  }).catch(() => null);

  revalidatePath("/");
  revalidatePath("/follow-ups");
  revalidatePath(`/leads/${id}`);
}

export async function clearFollowUpAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    throw new Error("Lead id is required.");
  }

  const prisma = getPrisma();

  await prisma.lead.update({
    where: { id },
    data: {
      followUpDate: null,
    },
  }).catch(() => null);

  revalidatePath("/");
  revalidatePath("/follow-ups");
  revalidatePath(`/leads/${id}`);
}

type ImportLeadRow = {
  business?: string;
  niche?: string;
  city?: string;
  website?: string;
  email?: string;
  phoneNumber?: string;
  issueFound?: string;
  priority?: string;
  contacted?: string | boolean;
  followUpDate?: string;
  googleMaps?: string;
  sourceLinks?: string;
  rawResearchText?: string;
  notes?: string;
  status?: string;
};

function optionalImportText(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function parseImportDate(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;

  const parsed = parseISO(text);
  return isValid(parsed) ? parsed : null;
}

function parseImportBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;

  return ["yes", "true", "1", "contacted"].includes(value.trim().toLowerCase());
}

function normalizeImportPriority(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  const upper = text.toUpperCase();

  if (leadPriorityValues.includes(upper as (typeof leadPriorityValues)[number])) {
    return upper as (typeof leadPriorityValues)[number];
  }

  const fromLabel = leadPriorityValues.find(
    (priority) => leadPriorityLabels[priority].toLowerCase() === text.toLowerCase(),
  );

  return fromLabel ?? "MEDIUM";
}

function normalizeImportStatus(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  const upper = text.toUpperCase().replaceAll(" ", "_").replaceAll("-", "_");

  if (leadStatusValues.includes(upper as (typeof leadStatusValues)[number])) {
    return upper as (typeof leadStatusValues)[number];
  }

  const fromLabel = leadStatusValues.find(
    (status) => leadStatusLabels[status].toLowerCase() === text.toLowerCase(),
  );

  return fromLabel ?? "NEW";
}

export async function importLeadsAction(formData: FormData) {
  const rowsJson = String(formData.get("rows") ?? "[]");
  let rows: ImportLeadRow[] = [];

  try {
    rows = JSON.parse(rowsJson) as ImportLeadRow[];
  } catch {
    redirect("/import?error=invalid-csv-preview");
  }

  if (!Array.isArray(rows)) {
    redirect("/import?error=invalid-csv-preview");
  }
  const prisma = getPrisma();
  let imported = 0;

  for (const row of rows) {
    const business = optionalImportText(row.business);

    if (!business) {
      continue;
    }

    const phoneNumber = optionalImportText(cleanImportedPhoneNumber(row.phoneNumber));
    const website = optionalImportText(row.website);
    const duplicateId = await findDuplicateLeadId({
      business,
      phoneNumber,
      website,
    });

    if (duplicateId) {
      continue;
    }

    await prisma.lead.create({
      data: {
        business,
        niche: optionalImportText(row.niche),
        city: optionalImportText(row.city),
        website,
        email: optionalImportText(row.email),
        phoneNumber,
        issueFound: optionalImportText(row.issueFound),
        priority: normalizeImportPriority(row.priority),
        contacted: parseImportBoolean(row.contacted),
        followUpDate: parseImportDate(row.followUpDate),
        googleMaps: optionalImportText(row.googleMaps),
        sourceLinks: optionalImportText(row.sourceLinks),
        rawResearchText: optionalImportText(row.rawResearchText),
        notes: optionalImportText(row.notes),
        status: normalizeImportStatus(row.status),
      },
    });
    imported += 1;
  }

  revalidatePath("/");
  revalidatePath("/follow-ups");
  redirect(`/?imported=${imported}`);
}
