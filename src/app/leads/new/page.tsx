import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createLeadAction } from "@/app/actions";
import { LeadForm } from "@/app/leads/LeadForm";

export default function AddLeadPage() {
  return (
    <main className="min-h-screen bg-[#090b10] px-5 py-6 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Dashboard
        </Link>

        <header className="mt-5 border-b border-slate-800 pb-5">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-300">
            New lead
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Add Lead</h1>
        </header>

        <div className="mt-6">
          <LeadForm
            action={createLeadAction}
            submitLabel="Save lead"
            cancelHref="/"
            enableAutofill
          />
        </div>
      </div>
    </main>
  );
}
