import Link from "next/link";
import {
  addDays,
  endOfDay,
  format,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
} from "date-fns";
import { CalendarClock, Clock, PhoneForwarded, type LucideIcon } from "lucide-react";
import type { Lead } from "@prisma/client";
import { LeadQuickActions } from "@/app/components/LeadQuickActions";
import { getPrisma } from "@/lib/prisma";
import { leadPriorityLabels, leadStatusLabels } from "@/lib/validation";

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

  if (["CONTACTED", "FOLLOW_UP", "REPLIED"].includes(status)) {
    return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
  }

  return "border-violet-500/30 bg-violet-500/10 text-violet-200";
}

function present(value: string | null) {
  return value?.trim() ? value : "-";
}

function FollowUpItem({ lead }: { lead: Lead }) {
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-950 p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <Link
            href={`/leads/${lead.id}`}
            className="text-lg font-semibold text-white hover:text-cyan-300"
          >
            {lead.business}
          </Link>
          <p className="mt-1 text-sm text-slate-400">{present(lead.niche)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${priorityClass(
                lead.priority,
              )}`}
            >
              {leadPriorityLabels[lead.priority]}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                lead.status,
              )}`}
            >
              {leadStatusLabels[lead.status]}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300">
              {lead.followUpDate ? format(lead.followUpDate, "MMM d, yyyy") : "No date"}
            </span>
          </div>
        </div>

        <LeadQuickActions
          leadId={lead.id}
          business={lead.business}
          showDelete={false}
          compact
        />
      </div>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Phone</p>
          <p className="mt-1 text-slate-300">{present(lead.phoneNumber)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Email</p>
          <p className="mt-1 break-words text-slate-300">{present(lead.email)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
            Follow-up
          </p>
          <p className="mt-1 text-slate-300">
            {lead.followUpDate ? format(lead.followUpDate, "MMM d, yyyy") : "Needs date"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Notes</p>
          <p className="mt-1 line-clamp-2 text-slate-300" title={lead.notes ?? undefined}>
            {present(lead.notes)}
          </p>
        </div>
      </div>
    </article>
  );
}

function groupByDate(leads: Lead[]) {
  return leads.reduce<Array<{ label: string; leads: Lead[] }>>((groups, lead) => {
    const label = lead.followUpDate
      ? format(lead.followUpDate, "EEEE, MMM d")
      : "No date";
    const existing = groups.find((group) => group.label === label);

    if (existing) {
      existing.leads.push(lead);
    } else {
      groups.push({ label, leads: [lead] });
    }

    return groups;
  }, []);
}

function FollowUpSection({
  title,
  description,
  icon: Icon,
  leads,
  dateGrouped = true,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  leads: Lead[];
  dateGrouped?: boolean;
}) {
  const groups = dateGrouped ? groupByDate(leads) : [{ label: "", leads }];

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
            <Icon className="h-5 w-5 text-cyan-300" aria-hidden="true" />
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
        <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-300">
          {leads.length}
        </span>
      </div>

      {groups.length > 0 && leads.length > 0 ? (
        groups.map((group) => (
          <div key={group.label || title} className="grid gap-3">
            {group.label ? (
              <p className="text-sm font-semibold text-slate-300">{group.label}</p>
            ) : null}
            {group.leads.map((lead) => (
              <FollowUpItem key={lead.id} lead={lead} />
            ))}
          </div>
        ))
      ) : (
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">
          No leads in this group.
        </div>
      )}
    </section>
  );
}

export default async function FollowUpsPage() {
  const prisma = getPrisma();
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const weekEnd = endOfDay(addDays(todayStart, 7));

  const [datedLeads, needsDate] = await Promise.all([
    prisma.lead.findMany({
      where: { followUpDate: { not: null } },
      orderBy: [{ followUpDate: "asc" }, { priority: "asc" }, { business: "asc" }],
    }),
    prisma.lead.findMany({
      where: { status: "FOLLOW_UP", followUpDate: null },
      orderBy: [{ priority: "asc" }, { business: "asc" }],
    }),
  ]);

  const overdue = datedLeads.filter(
    (lead) => lead.followUpDate && isBefore(lead.followUpDate, todayStart),
  );
  const dueToday = datedLeads.filter(
    (lead) => lead.followUpDate && isSameDay(lead.followUpDate, todayStart),
  );
  const dueThisWeek = datedLeads.filter(
    (lead) =>
      lead.followUpDate &&
      isAfter(lead.followUpDate, todayEnd) &&
      !isAfter(lead.followUpDate, weekEnd),
  );
  const upcoming = datedLeads.filter(
    (lead) => lead.followUpDate && isAfter(lead.followUpDate, weekEnd),
  );

  return (
    <main className="min-h-screen bg-[#090b10] px-4 py-6 text-slate-100 sm:px-6">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-7">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-300">
              BuiltBetter
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Follow-Ups</h1>
          </div>
          <Link
            href="/"
            className="inline-flex h-10 w-fit items-center rounded-md border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
          >
            Dashboard
          </Link>
        </header>

        <FollowUpSection
          title="Needs Follow-Up Date"
          description="Follow-up leads that still need a scheduled date."
          icon={CalendarClock}
          leads={needsDate}
          dateGrouped={false}
        />
        <FollowUpSection
          title="Overdue"
          description="Follow-ups that are past their scheduled date."
          icon={PhoneForwarded}
          leads={overdue}
        />
        <FollowUpSection
          title="Due Today"
          description="Leads that need attention today."
          icon={Clock}
          leads={dueToday}
        />
        <FollowUpSection
          title="Due This Week"
          description="Upcoming follow-ups in the next seven days."
          icon={CalendarClock}
          leads={dueThisWeek}
        />
        <FollowUpSection
          title="Upcoming"
          description="Scheduled follow-ups further out."
          icon={CalendarClock}
          leads={upcoming}
        />
      </div>
    </main>
  );
}
