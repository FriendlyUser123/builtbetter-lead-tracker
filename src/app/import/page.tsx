import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { importLeadsAction } from "@/app/actions";
import { CsvImportTool } from "@/app/import/CsvImportTool";

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[#090b10] px-5 py-6 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Dashboard
        </Link>

        <header className="mt-5 border-b border-slate-800 pb-5">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-300">
            CSV
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Import Leads</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Preview rows before saving. Duplicates are skipped when business name
            plus phone or website already exists.
          </p>
        </header>

        <div className="mt-6">
          {params.error ? (
            <p className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              The CSV preview could not be saved. Please choose the file again
              and review the preview before importing.
            </p>
          ) : null}
          <CsvImportTool action={importLeadsAction} />
        </div>
      </div>
    </main>
  );
}
