"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
import { Upload } from "lucide-react";
import {
  cleanImportedPhoneNumber,
  normalizeCsvHeaderForImport,
} from "@/lib/lead-csv";

type CsvRow = {
  business?: string;
  niche?: string;
  city?: string;
  website?: string;
  email?: string;
  phoneNumber?: string;
  issueFound?: string;
  priority?: string;
  contacted?: string;
  followUpDate?: string;
  googleMaps?: string;
  sourceLinks?: string;
  rawResearchText?: string;
  notes?: string;
  status?: string;
};

const previewColumns = [
  "business",
  "niche",
  "city",
  "website",
  "email",
  "phoneNumber",
  "priority",
  "followUpDate",
  "status",
];

export function CsvImportTool({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const rowsJson = useMemo(() => JSON.stringify(rows), [rows]);

  function handleFile(file: File | undefined) {
    setError(null);
    setRows([]);

    if (!file) return;

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeCsvHeaderForImport,
      transform: (value, field) =>
        field === "phoneNumber" ? cleanImportedPhoneNumber(value) : value,
      complete: (result) => {
        const parsedRows = result.data.filter((row) => row.business?.trim());
        setRows(parsedRows);

        if (parsedRows.length === 0) {
          setError("No rows with a business name were found.");
        }
      },
      error: () => {
        setError("Could not read that CSV file.");
      },
    });
  }

  return (
    <section className="grid gap-5">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-950 px-6 py-10 text-center transition hover:border-cyan-400/70 hover:bg-slate-900">
        <Upload className="h-7 w-7 text-cyan-300" aria-hidden="true" />
        <span className="mt-3 text-sm font-semibold text-white">Choose CSV file</span>
        <span className="mt-1 text-sm text-slate-400">
          Expected headers include business, phoneNumber, website, email, notes, and status.
        </span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      </label>

      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <form action={action} className="grid gap-4">
          <input type="hidden" name="rows" value={rowsJson} />
          <div className="rounded-lg border border-slate-800 bg-slate-950">
            <div className="border-b border-slate-800 px-4 py-3">
              <p className="text-sm font-semibold text-white">
                Previewing {rows.length} row{rows.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead className="bg-slate-900 text-xs uppercase tracking-[0.12em] text-slate-400">
                  <tr>
                    {previewColumns.map((column) => (
                      <th key={column} className="px-4 py-3 font-medium">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 25).map((row, index) => (
                    <tr key={index} className="border-t border-slate-800">
                      {previewColumns.map((column) => (
                        <td key={column} className="max-w-[180px] truncate px-4 py-3 text-slate-300">
                          {row[column as keyof CsvRow] || "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            type="submit"
            className="h-10 w-fit rounded-md bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
          >
            Save imported leads
          </button>
        </form>
      ) : null}
    </section>
  );
}
