"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090b10] px-5 py-6 text-slate-100">
      <section className="max-w-lg rounded-lg border border-red-500/30 bg-slate-950 p-6">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-red-300">
          Something went wrong
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          The app hit an error.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          {error.message ||
            "Try again. If this keeps happening, check the terminal output for the detailed error."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 h-10 rounded-md bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
