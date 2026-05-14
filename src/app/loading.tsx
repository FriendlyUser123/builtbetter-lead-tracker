export default function Loading() {
  return (
    <main className="min-h-screen bg-[#090b10] px-5 py-6 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <div className="h-8 w-56 animate-pulse rounded-md bg-slate-800" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-lg border border-slate-800 bg-slate-950"
            />
          ))}
        </div>
        <div className="mt-6 h-80 animate-pulse rounded-lg border border-slate-800 bg-slate-950" />
      </div>
    </main>
  );
}
