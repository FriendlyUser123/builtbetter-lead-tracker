import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { updateLeadAction } from "@/app/actions";
import { LeadQuickActions } from "@/app/components/LeadQuickActions";
import { LeadForm } from "@/app/leads/LeadForm";
import { OutreachTools } from "./OutreachTools";
import { getPrisma } from "@/lib/prisma";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prisma = getPrisma();
  const lead = await prisma.lead.findUnique({ where: { id } });

  if (!lead) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#090b10] px-5 py-6 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Dashboard
          </Link>
          <Link
            href={`/leads/${lead.id}/delete`}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-red-500/40 px-4 text-sm font-semibold text-red-200 transition hover:border-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete Lead
          </Link>
        </div>

        <header className="mt-5 border-b border-slate-800 pb-5">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-300">
            Edit lead
          </p>
          <h1 className="mt-2 text-3xl font-semibold">{lead.business}</h1>
        </header>

        <div className="mt-6">
          <section className="mb-6 rounded-lg border border-slate-800 bg-slate-950 p-5">
            <div className="mb-4">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-300">
                Follow-up controls
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Contact and follow-up
              </h2>
            </div>
            <LeadQuickActions
              leadId={lead.id}
              business={lead.business}
              showEdit={false}
              showDelete={false}
            />
          </section>

          <LeadForm
            action={updateLeadAction}
            lead={lead}
            submitLabel="Save changes"
            cancelHref="/"
          />
        </div>

        <div className="mt-6">
          <OutreachTools lead={lead} />
        </div>
      </div>
    </main>
  );
}
