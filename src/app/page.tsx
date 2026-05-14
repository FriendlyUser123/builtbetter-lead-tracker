import Link from "next/link";
import { addDays, format, startOfDay } from "date-fns";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  CalendarClock,
  CheckCircle2,
  Download,
  ExternalLink,
  Flame,
  FileUp,
  Plus,
  Search,
  Users,
} from "lucide-react";
import type { Prisma } from "@prisma/client";
import { LeadQuickActions } from "@/app/components/LeadQuickActions";
import { getPrisma } from "@/lib/prisma";
import {
  leadPriorityLabels,
  leadPriorityValues,
  leadStatusLabels,
  leadStatusValues,
} from "@/lib/validation";
import { normalizeExternalUrl } from "@/lib/url-utils";

type DashboardSearchParams = Promise<{
  q?: string;
  priority?: string;
  status?: string;
  contacted?: string;
  followUpSort?: string;
  imported?: string;
}>;

function hasValue<T extends readonly string[]>(
  values: T,
  value: string | undefined,
): value is T[number] {
  return Boolean(value && values.includes(value));
}

function present(value: string | null) {
  return value?.trim() ? value : "-";
}

function priorityClass(priority: string) {
  if (priority === "HIGH") {
    return "border-red-500/30 bg-red-500/10 text-red-200";
  }

  if (priority === "LOW") {
    return "border-slate-600 bg-slate-800 text-slate-300";
  }

  return "border-amber-500/30 bg-amber-500/10 text-amber-200";
}

function statusClass(status: string) {
  if (["INTERESTED", "CLOSED"].includes(status)) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }

  if (["NOT_INTERESTED"].includes(status)) {
    return "border-slate-600 bg-slate-800 text-slate-300";
  }

  if (["CONTACTED", "FOLLOW_UP", "REPLIED"].includes(status)) {
    return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
  }

  return "border-violet-500/30 bg-violet-500/10 text-violet-200";
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: DashboardSearchParams;
}) {
  const params = await searchParams;
  const prisma = getPrisma();
  const query = params.q?.trim();
  const priority = hasValue(leadPriorityValues, params.priority)
    ? params.priority
    : undefined;
  const status = hasValue(leadStatusValues, params.status)
    ? params.status
    : undefined;
  const contacted =
    params.contacted === "yes"
      ? true
      : params.contacted === "no"
        ? false
        : undefined;
  const followUpSort = params.followUpSort === "asc" ? "asc" : "desc";

  const where: Prisma.LeadWhereInput = {
    ...(query
      ? {
          OR: [
            { business: { contains: query } },
            { niche: { contains: query } },
            { city: { contains: query } },
            { website: { contains: query } },
            { email: { contains: query } },
            { phoneNumber: { contains: query } },
            { issueFound: { contains: query } },
            { notes: { contains: query } },
          ],
        }
      : {}),
    ...(priority ? { priority } : {}),
    ...(status ? { status } : {}),
    ...(contacted === undefined ? {} : { contacted }),
  };

  const [leads, totalLeads, highPriorityLeads, contactedLeads, dueSoonLeads] =
    await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy:
          params.followUpSort === "asc" || params.followUpSort === "desc"
            ? [{ followUpDate: followUpSort }, { createdAt: "desc" }]
            : [{ createdAt: "desc" }],
      }),
      prisma.lead.count(),
      prisma.lead.count({ where: { priority: "HIGH" } }),
      prisma.lead.count({ where: { contacted: true } }),
      prisma.lead.count({
        where: {
          followUpDate: {
            gte: startOfDay(new Date()),
            lte: addDays(startOfDay(new Date()), 7),
          },
        },
      }),
    ]);

  const statCards = [
    { label: "Total leads", value: totalLeads, icon: Users },
    { label: "High priority", value: highPriorityLeads, icon: Flame },
    { label: "Contacted", value: contactedLeads, icon: CheckCircle2 },
    { label: "Due soon", value: dueSoonLeads, icon: CalendarClock },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#090b10] px-3 py-6 text-slate-100 sm:px-5 2xl:px-8">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-300">
              BuiltBetter
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              Lead Tracker
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/follow-ups"
              className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              Follow-Ups
            </Link>
            <Link
              href="/import"
              className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              <FileUp className="h-4 w-4" aria-hidden="true" />
              Import
            </Link>
            <a
              href="/api/leads/export"
              className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export
            </a>
            <Link
              href="/leads/new"
              className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Lead
            </Link>
          </div>
        </header>

        {params.imported ? (
          <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Imported {params.imported} lead{params.imported === "1" ? "" : "s"}.
            Duplicates were skipped.
          </p>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.label}
                className="rounded-lg border border-slate-800 bg-slate-950 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">{card.label}</p>
                  <Icon className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                </div>
                <p className="mt-3 text-3xl font-semibold">{card.value}</p>
              </article>
            );
          })}
        </section>

        <form className="rounded-lg border border-slate-800 bg-slate-950 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.5fr)_repeat(4,minmax(160px,1fr))]">
            <label className="flex h-10 items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-300">
              <Search className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Search leads"
                className="min-w-0 flex-1 bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
              />
            </label>

            <select
              name="priority"
              defaultValue={priority ?? ""}
              className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none"
            >
              <option value="">All priorities</option>
              {leadPriorityValues.map((value) => (
                <option key={value} value={value}>
                  {leadPriorityLabels[value]}
                </option>
              ))}
            </select>

            <select
              name="status"
              defaultValue={status ?? ""}
              className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none"
            >
              <option value="">All statuses</option>
              {leadStatusValues.map((value) => (
                <option key={value} value={value}>
                  {leadStatusLabels[value]}
                </option>
              ))}
            </select>

            <select
              name="contacted"
              defaultValue={params.contacted ?? ""}
              className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none"
            >
              <option value="">All contact states</option>
              <option value="yes">Contacted</option>
              <option value="no">Not contacted</option>
            </select>

            <select
              name="followUpSort"
              defaultValue={params.followUpSort ?? ""}
              className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none"
            >
              <option value="">Newest first</option>
              <option value="asc">Follow-up earliest</option>
              <option value="desc">Follow-up latest</option>
            </select>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-100 px-4 text-sm font-semibold text-slate-950 transition hover:bg-white"
            >
              Apply
            </button>
            <Link
              href="/"
              className="inline-flex h-9 items-center rounded-md border border-slate-700 px-4 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Reset
            </Link>
            <Link
              href={`/?followUpSort=${followUpSort === "asc" ? "desc" : "asc"}`}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700 px-4 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              {followUpSort === "asc" ? (
                <ArrowDownAZ className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ArrowUpAZ className="h-4 w-4" aria-hidden="true" />
              )}
              Toggle follow-up sort
            </Link>
          </div>
        </form>

        <section className="rounded-lg border border-slate-800 bg-slate-950">
          <div className="hidden overflow-x-auto overscroll-x-contain lg:block [scrollbar-color:#334155_#020617] [scrollbar-width:thin]">
            <table className="min-w-[1680px] w-full table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[170px]" />
                <col className="w-[130px]" />
                <col className="w-[120px]" />
                <col className="w-[105px]" />
                <col className="w-[190px]" />
                <col className="w-[135px]" />
                <col className="w-[260px]" />
                <col className="w-[110px]" />
                <col className="w-[115px]" />
                <col className="w-[135px]" />
                <col className="w-[125px]" />
                <col className="w-[145px]" />
                <col className="w-[720px]" />
              </colgroup>
              <thead className="bg-slate-900 text-xs uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Business</th>
                  <th className="px-4 py-3 font-medium">Niche</th>
                  <th className="px-4 py-3 font-medium">City</th>
                  <th className="px-4 py-3 font-medium">Website</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Issue Found</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Contacted?</th>
                  <th className="px-4 py-3 font-medium">Follow-up Date</th>
                  <th className="px-4 py-3 font-medium">Google Maps?</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const websiteUrl = normalizeExternalUrl(lead.website);

                  return (
                    <tr
                      key={lead.id}
                      className="border-t border-slate-800 transition hover:bg-slate-900/70"
                    >
                      <td className="px-4 py-3 font-medium text-white">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="hover:text-cyan-300"
                        >
                        {lead.business}
                      </Link>
                    </td>
                      <td
                        className="truncate px-4 py-3 text-slate-300"
                        title={lead.niche ?? undefined}
                      >
                        {present(lead.niche)}
                      </td>
                      <td
                        className="truncate px-4 py-3 text-slate-300"
                        title={lead.city ?? undefined}
                      >
                        {present(lead.city)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {websiteUrl ? (
                          <a
                            href={websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 px-2.5 py-1.5 text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-300/10 hover:text-cyan-100"
                          >
                            Open
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          </a>
                        ) : (
                          <span className="text-slate-500">No website</span>
                        )}
                      </td>
                      <td
                        className="truncate px-4 py-3 text-slate-300"
                        title={lead.email ?? undefined}
                      >
                        {present(lead.email)}
                      </td>
                      <td
                        className="truncate px-4 py-3 text-slate-300"
                        title={lead.phoneNumber ?? undefined}
                      >
                        {present(lead.phoneNumber)}
                      </td>
                      <td
                        className="truncate px-4 py-3 text-slate-300"
                        title={lead.issueFound ?? undefined}
                      >
                        {present(lead.issueFound)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${priorityClass(
                            lead.priority,
                          )}`}
                        >
                          {leadPriorityLabels[lead.priority]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {lead.contacted ? "Yes" : "No"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {lead.followUpDate
                          ? format(lead.followUpDate, "MMM d, yyyy")
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {lead.googleMaps ? (
                          <a
                            href={normalizeExternalUrl(lead.googleMaps) ?? lead.googleMaps}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 px-2.5 py-1.5 text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-300/10 hover:text-cyan-100"
                          >
                            Open
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          </a>
                        ) : (
                          "No"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                            lead.status,
                          )}`}
                        >
                          {leadStatusLabels[lead.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <LeadQuickActions
                          leadId={lead.id}
                          business={lead.business}
                          compact
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-3 lg:hidden">
            {leads.map((lead) => {
              const websiteUrl = normalizeExternalUrl(lead.website);

              return (
                <article
                  key={lead.id}
                  className="rounded-lg border border-slate-800 bg-slate-900 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="block truncate text-base font-semibold text-white hover:text-cyan-300"
                      >
                        {lead.business}
                      </Link>
                      <p className="mt-1 truncate text-sm text-slate-400">
                        {[lead.niche, lead.city].filter(Boolean).join(" • ") ||
                          "No niche or city"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${priorityClass(
                        lead.priority,
                      )}`}
                    >
                      {leadPriorityLabels[lead.priority]}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                        Issue
                      </p>
                      <p
                        className="mt-1 line-clamp-2 text-slate-300"
                        title={lead.issueFound ?? undefined}
                      >
                        {present(lead.issueFound)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                          Email
                        </p>
                        <p
                          className="mt-1 truncate text-slate-300"
                          title={lead.email ?? undefined}
                        >
                          {present(lead.email)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                          Phone
                        </p>
                        <p
                          className="mt-1 truncate text-slate-300"
                          title={lead.phoneNumber ?? undefined}
                        >
                          {present(lead.phoneNumber)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                          Follow-up
                        </p>
                        <p className="mt-1 text-slate-300">
                          {lead.followUpDate
                            ? format(lead.followUpDate, "MMM d, yyyy")
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                          Contacted
                        </p>
                        <p className="mt-1 text-slate-300">
                          {lead.contacted ? "Yes" : "No"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                          Google Maps
                        </p>
                        <p className="mt-1 text-slate-300">
                          {lead.googleMaps ? "Yes" : "No"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                          Status
                        </p>
                        <span
                          className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                            lead.status,
                          )}`}
                        >
                          {leadStatusLabels[lead.status]}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {websiteUrl ? (
                      <a
                        href={websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-cyan-500/30 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-300/10"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        Open
                      </a>
                    ) : (
                      <span className="inline-flex h-10 items-center justify-center rounded-md border border-slate-700 text-sm text-slate-500">
                        No website
                      </span>
                    )}
                    {lead.googleMaps ? (
                      <a
                        href={normalizeExternalUrl(lead.googleMaps) ?? lead.googleMaps}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-cyan-500/30 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-300/10"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        Maps
                      </a>
                    ) : (
                      <span className="inline-flex h-10 items-center justify-center rounded-md border border-slate-700 text-sm text-slate-500">
                        No maps
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <LeadQuickActions leadId={lead.id} business={lead.business} />
                  </div>
                </article>
              );
            })}
          </div>

          {leads.length === 0 ? (
            <div className="border-t border-slate-800 px-4 py-12 text-center">
              <p className="text-lg font-medium text-white">No leads found</p>
              <p className="mt-2 text-sm text-slate-400">
                Add a lead or adjust your filters.
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
