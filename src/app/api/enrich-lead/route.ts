import { NextResponse } from "next/server";
import { z } from "zod";
import { enrichLeadFromSourceLinks } from "@/lib/enrichment";

const requestSchema = z.object({
  sourceLinks: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Source links are required." },
      { status: 400 },
    );
  }

  try {
    const result = await enrichLeadFromSourceLinks(parsed.data.sourceLinks);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        fields: {},
        platforms: [],
        warnings: [
          "Autofill could not read those public pages. You can still save the lead manually.",
        ],
      },
      { status: 200 },
    );
  }
}
