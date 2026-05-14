"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { EnrichedField, EnrichmentResult } from "@/lib/enrichment";
import {
  leadPriorityLabels,
  leadPriorityValues,
  leadStatusLabels,
  leadStatusValues,
} from "@/lib/validation";

type LeadFormValues = {
  id?: string;
  business?: string;
  niche?: string | null;
  city?: string | null;
  website?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  issueFound?: string | null;
  priority?: (typeof leadPriorityValues)[number];
  contacted?: boolean;
  followUpDate?: Date | null;
  googleMaps?: string | null;
  sourceLinks?: string | null;
  notes?: string | null;
  status?: (typeof leadStatusValues)[number];
};

type LeadFormProps = {
  action: (formData: FormData) => Promise<void>;
  lead?: LeadFormValues;
  submitLabel: string;
  cancelHref: string;
  enableAutofill?: boolean;
};

function dateInputValue(date: Date | null | undefined) {
  return date ? format(date, "yyyy-MM-dd") : "";
}

type FormValues = {
  business: string;
  niche: string;
  city: string;
  website: string;
  email: string;
  phoneNumber: string;
  issueFound: string;
  priority: (typeof leadPriorityValues)[number];
  contacted: boolean;
  followUpDate: string;
  googleMaps: string;
  sourceLinks: string;
  notes: string;
  status: (typeof leadStatusValues)[number];
};

const emptyValues: FormValues = {
  business: "",
  niche: "",
  city: "",
  website: "",
  email: "",
  phoneNumber: "",
  issueFound: "",
  priority: "MEDIUM",
  contacted: false,
  followUpDate: "",
  googleMaps: "",
  sourceLinks: "",
  notes: "",
  status: "NEW",
};

const fieldLabels: Record<string, string> = {
  business: "Business",
  niche: "Niche",
  city: "City",
  website: "Website",
  email: "Email",
  phoneNumber: "Phone Number",
  issueFound: "Issue Found",
  priority: "Priority",
  googleMaps: "Google Maps",
};

function confidenceClass(confidence: string) {
  if (confidence === "high") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }

  if (confidence === "medium") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  }

  return "border-red-500/30 bg-red-500/10 text-red-200";
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  name: keyof FormValues;
  value: string;
  onChange: (name: keyof FormValues, value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  value,
  onChange,
  rows = 4,
  placeholder,
  actionSlot,
}: {
  label: string;
  name: keyof FormValues;
  value: string;
  onChange: (name: keyof FormValues, value: string) => void;
  rows?: number;
  placeholder?: string;
  actionSlot?: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        {actionSlot}
      </span>
      <textarea
        name={name}
        rows={rows}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        className="resize-y rounded-md border border-slate-700 bg-slate-900 px-3 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300"
      />
    </label>
  );
}

export function LeadForm({
  action,
  lead,
  submitLabel,
  cancelHref,
  enableAutofill = false,
}: LeadFormProps) {
  const initialValues = useMemo<FormValues>(
    () => ({
      ...emptyValues,
      business: lead?.business ?? "",
      niche: lead?.niche ?? "",
      city: lead?.city ?? "",
      website: lead?.website ?? "",
      email: lead?.email ?? "",
      phoneNumber: lead?.phoneNumber ?? "",
      issueFound: lead?.issueFound ?? "",
      priority: lead?.priority ?? "MEDIUM",
      contacted: lead?.contacted ?? false,
      followUpDate: dateInputValue(lead?.followUpDate),
      googleMaps: lead?.googleMaps ?? "",
      sourceLinks: lead?.sourceLinks ?? "",
      notes: lead?.notes ?? "",
      status: lead?.status ?? "NEW",
    }),
    [lead],
  );
  const [values, setValues] = useState<FormValues>(initialValues);
  const [enrichment, setEnrichment] = useState<EnrichmentResult | null>(null);
  const [autofillError, setAutofillError] = useState<string | null>(null);
  const [isAutofilling, setIsAutofilling] = useState(false);

  function updateField(name: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function applyEnrichment(result: EnrichmentResult) {
    setValues((current) => {
      const next = { ...current };

      for (const [fieldName, extracted] of Object.entries(result.fields)) {
        if (!extracted?.value) continue;

        if (fieldName === "priority") {
          if (leadPriorityValues.includes(extracted.value as FormValues["priority"])) {
            next.priority = extracted.value as FormValues["priority"];
          }
          continue;
        }

        if (
          fieldName === "business" ||
          fieldName === "niche" ||
          fieldName === "city" ||
          fieldName === "website" ||
          fieldName === "email" ||
          fieldName === "phoneNumber" ||
          fieldName === "issueFound" ||
          fieldName === "googleMaps"
        ) {
          if (!next[fieldName]) {
            next[fieldName] = extracted.value;
          }
        }
      }

      return next;
    });
  }

  function autofillLead() {
    setAutofillError(null);

    if (!values.sourceLinks.trim()) {
      setAutofillError("Paste one or more public links into Source Links first.");
      return;
    }

    setIsAutofilling(true);

    void (async () => {
      try {
        const response = await fetch("/api/enrich-lead", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ sourceLinks: values.sourceLinks }),
        });

        if (!response.ok) {
          throw new Error("Autofill failed.");
        }

        const result = (await response.json()) as EnrichmentResult;
        setEnrichment(result);
        applyEnrichment(result);
      } catch {
        setAutofillError(
          "Autofill could not read those public pages. You can still save the lead manually.",
        );
      } finally {
        setIsAutofilling(false);
      }
    })();
  }

  function clearForm() {
    setValues(emptyValues);
    setEnrichment(null);
    setAutofillError(null);
  }

  const enrichmentEntries = enrichment
    ? (Object.entries(enrichment.fields).filter((entry) =>
        Boolean(entry[1]),
      ) as Array<[string, EnrichedField]>)
    : [];

  return (
    <form action={action} className="grid gap-6">
      {lead?.id ? <input type="hidden" name="id" value={lead.id} /> : null}

      <section className="grid gap-4 rounded-lg border border-slate-800 bg-slate-950 p-5 md:grid-cols-2">
        <Field
          label="Business"
          name="business"
          required
          value={values.business}
          onChange={updateField}
          placeholder="Acme Roofing"
        />
        <Field
          label="Niche"
          name="niche"
          value={values.niche}
          onChange={updateField}
        />
        <Field label="City" name="city" value={values.city} onChange={updateField} />
        <Field
          label="Website"
          name="website"
          value={values.website}
          onChange={updateField}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          value={values.email}
          onChange={updateField}
        />
        <Field
          label="Phone Number"
          name="phoneNumber"
          value={values.phoneNumber}
          onChange={updateField}
        />
        <Field
          label="Follow-up Date"
          name="followUpDate"
          type="date"
          value={values.followUpDate}
          onChange={updateField}
        />
        <Field
          label="Google Maps"
          name="googleMaps"
          value={values.googleMaps}
          onChange={updateField}
          placeholder="Google Maps listing URL"
        />

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">Priority</span>
          <select
            name="priority"
            value={values.priority}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                priority: event.target.value as FormValues["priority"],
              }))
            }
            className="h-11 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none transition focus:border-cyan-300"
          >
            {leadPriorityValues.map((value) => (
              <option key={value} value={value}>
                {leadPriorityLabels[value]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">Status</span>
          <select
            name="status"
            value={values.status}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                status: event.target.value as FormValues["status"],
              }))
            }
            className="h-11 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none transition focus:border-cyan-300"
          >
            {leadStatusValues.map((value) => (
              <option key={value} value={value}>
                {leadStatusLabels[value]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-3 rounded-md border border-slate-800 bg-slate-900 px-3 py-3">
          <input
            name="contacted"
            type="checkbox"
            checked={values.contacted}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                contacted: event.target.checked,
              }))
            }
            className="h-4 w-4 accent-cyan-300"
          />
          <span className="text-sm font-medium text-slate-300">Contacted?</span>
        </label>
      </section>

      <section className="grid gap-4 rounded-lg border border-slate-800 bg-slate-950 p-5">
        <TextArea
          label="Issue Found"
          name="issueFound"
          value={values.issueFound}
          onChange={updateField}
          placeholder="Website issue, missing CTA, broken mobile layout..."
        />
        <TextArea
          label="Source Links"
          name="sourceLinks"
          rows={7}
          value={values.sourceLinks}
          onChange={updateField}
          placeholder="Public URLs, Google Maps listing, directory pages, notes from manual research..."
          actionSlot={
            enableAutofill ? (
              <button
                type="button"
                onClick={autofillLead}
                disabled={isAutofilling}
                className="inline-flex h-8 items-center gap-2 rounded-md border border-cyan-500/40 px-3 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-300/10 disabled:cursor-wait disabled:opacity-60"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {isAutofilling ? "Autofilling..." : "Autofill"}
              </button>
            ) : null
          }
        />
        <TextArea
          label="Notes"
          name="notes"
          rows={5}
          value={values.notes}
          onChange={updateField}
        />
      </section>

      {autofillError ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {autofillError}
        </p>
      ) : null}

      {enrichment ? (
        <section className="rounded-lg border border-slate-800 bg-slate-950 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Autofill Results</h2>
              <p className="mt-1 text-sm text-slate-400">
                Values were applied to blank fields. Review everything before saving.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {enrichment.platforms.map((item) => (
                <span
                  key={`${item.platform}-${item.url}`}
                  className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300"
                >
                  {item.platform}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {enrichmentEntries.map(([fieldName, extracted]) => (
              <div
                key={fieldName}
                className="rounded-md border border-slate-800 bg-slate-900 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-slate-200">
                    {fieldLabels[fieldName] ?? fieldName}
                  </p>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${confidenceClass(
                      extracted.confidence,
                    )}`}
                  >
                    {extracted.confidence}
                  </span>
                </div>
                <p className="mt-2 break-words text-sm text-slate-300">
                  {extracted.value}
                </p>
                <p className="mt-2 truncate text-xs text-slate-500">
                  Source: {extracted.sourceUrl}
                </p>
              </div>
            ))}
          </div>

          {enrichment.warnings.length > 0 ? (
            <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="text-sm font-medium text-amber-100">
                Review low-confidence values
              </p>
              <ul className="mt-2 space-y-1 text-sm text-amber-100/80">
                {enrichment.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="h-10 rounded-md bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
        >
          {submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="inline-flex h-10 items-center rounded-md border border-slate-700 px-5 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={clearForm}
          className="h-10 rounded-md border border-slate-700 px-5 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
        >
          Clear form
        </button>
      </div>
    </form>
  );
}
