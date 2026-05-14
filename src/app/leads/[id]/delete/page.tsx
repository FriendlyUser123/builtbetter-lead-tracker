import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { deleteLeadAction } from "@/app/actions";
import { getPrisma } from "@/lib/prisma";

export default async function DeleteLeadPage({
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
    <main className="flex min-h-screen items-center justify-center bg-[#090b10] px-5 py-6 text-slate-100">
      <section className="w-full max-w-xl rounded-lg border border-slate-800 bg-slate-950 p-6">
        <Link
          href={`/leads/${lead.id}`}
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to lead
        </Link>

        <div className="mt-6">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-200">
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold">Delete {lead.business}?</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            This removes the lead from the local SQLite database. This action
            cannot be undone from inside the app.
          </p>
        </div>

        <form action={deleteLeadAction} className="mt-6 flex flex-wrap gap-3">
          <input type="hidden" name="id" value={lead.id} />
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-red-500 px-5 text-sm font-semibold text-white transition hover:bg-red-400"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete lead
          </button>
          <Link
            href={`/leads/${lead.id}`}
            className="inline-flex h-10 items-center rounded-md border border-slate-700 px-5 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            Cancel
          </Link>
        </form>
      </section>
    </main>
  );
}
