import Papa from "papaparse";

export type CsvLeadRow = {
  business: string;
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
  notes?: string;
  status?: string;
};

export function parseLeadCsv(csv: string) {
  return Papa.parse<CsvLeadRow>(csv, {
    header: true,
    skipEmptyLines: true,
  });
}

export function exportLeadCsv(rows: CsvLeadRow[]) {
  return Papa.unparse(rows);
}
