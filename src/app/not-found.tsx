import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090b10] px-5 py-6 text-slate-100">
      <section className="max-w-lg rounded-lg border border-slate-800 bg-slate-950 p-6">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-300">
          Not found
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          That page or lead does not exist.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          It may have been deleted, or the link may be old.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex h-10 items-center rounded-md bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
        >
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}
