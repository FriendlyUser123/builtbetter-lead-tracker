import Link from "next/link";
import { CalendarClock, CheckCircle2, Pencil, Trash2, XCircle } from "lucide-react";
import {
  clearFollowUpAction,
  markLeadContactedAction,
  markLeadNotContactedAction,
  pushFollowUpAction,
} from "@/app/actions";

type LeadQuickActionsProps = {
  leadId: string;
  business: string;
  showEdit?: boolean;
  showDelete?: boolean;
  compact?: boolean;
};

function FollowUpButton({
  leadId,
  days,
  label,
  compact,
}: {
  leadId: string;
  days: number;
  label: string;
  compact?: boolean;
}) {
  return (
    <form action={pushFollowUpAction}>
      <input type="hidden" name="id" value={leadId} />
      <input type="hidden" name="days" value={days} />
      <button
        type="submit"
        className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border border-amber-500/40 text-sm font-semibold text-amber-100 transition hover:border-amber-300 hover:bg-amber-500/10 ${
          compact ? "px-2.5" : "px-3"
        }`}
      >
        <CalendarClock className="h-4 w-4" aria-hidden="true" />
        {label}
      </button>
    </form>
  );
}

export function LeadQuickActions({
  leadId,
  business,
  showEdit = true,
  showDelete = true,
  compact = false,
}: LeadQuickActionsProps) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <form action={markLeadContactedAction}>
        <input type="hidden" name="id" value={leadId} />
        <button
          type="submit"
          className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border border-emerald-500/40 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/10 ${
            compact ? "px-2.5" : "px-3"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Mark contacted
        </button>
      </form>

      <form action={markLeadNotContactedAction}>
        <input type="hidden" name="id" value={leadId} />
        <button
          type="submit"
          className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-600 text-sm font-semibold text-slate-200 transition hover:border-slate-400 hover:bg-slate-800 ${
            compact ? "px-2.5" : "px-3"
          }`}
        >
          <XCircle className="h-4 w-4" aria-hidden="true" />
          Mark not contacted
        </button>
      </form>

      <FollowUpButton
        leadId={leadId}
        days={1}
        label="Follow up tomorrow"
        compact={compact}
      />
      <FollowUpButton
        leadId={leadId}
        days={3}
        label="Follow up in 3 days"
        compact={compact}
      />
      <FollowUpButton
        leadId={leadId}
        days={7}
        label="Follow up in 7 days"
        compact={compact}
      />

      <form action={clearFollowUpAction}>
        <input type="hidden" name="id" value={leadId} />
        <button
          type="submit"
          className={`inline-flex h-9 items-center justify-center rounded-md border border-slate-600 text-sm font-semibold text-slate-200 transition hover:border-slate-400 hover:bg-slate-800 ${
            compact ? "px-2.5" : "px-3"
          }`}
        >
          Clear follow-up
        </button>
      </form>

      {showEdit ? (
        <Link
          href={`/leads/${leadId}`}
          aria-label={`Edit ${business}`}
          title="View/Edit"
          className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border border-cyan-500/40 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-300/10 ${
            compact ? "px-2.5" : "px-3"
          }`}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Edit
        </Link>
      ) : null}

      {showDelete ? (
        <Link
          href={`/leads/${leadId}/delete`}
          aria-label={`Delete ${business}`}
          title="Delete"
          className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border border-red-500/40 text-sm font-semibold text-red-100 transition hover:border-red-300 hover:bg-red-500/10 ${
            compact ? "px-2.5" : "px-3"
          }`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete
        </Link>
      ) : null}
    </div>
  );
}
