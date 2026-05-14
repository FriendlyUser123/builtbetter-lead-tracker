import Papa from "papaparse";
import { getPrisma } from "@/lib/prisma";
import { mapLeadToCsvRow, readableCsvHeaders } from "@/lib/lead-csv";

export async function GET() {
  const prisma = getPrisma();
  const leads = await prisma.lead.findMany({
    orderBy: [{ createdAt: "desc" }],
  });

  const csv = Papa.unparse({
    fields: [...readableCsvHeaders],
    data: leads.map(mapLeadToCsvRow),
  });

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="builtbetter-leads.csv"',
    },
  });
}
