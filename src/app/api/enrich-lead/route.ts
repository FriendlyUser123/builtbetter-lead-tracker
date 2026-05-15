import { NextResponse } from "next/server";
import { z } from "zod";
import { enrichLeadFromSourceLinks } from "@/lib/enrichment";

const requestSchema = z.object({
  sourceLinks: z.string().optional().default(""),
  rawResearchText: z.string().optional().default(""),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (
    !parsed.success ||
    (!parsed.data.sourceLinks.trim() && !parsed.data.rawResearchText.trim())
  ) {
    return NextResponse.json(
      { error: "Source links or raw research text are required." },
      { status: 400 },
    );
  }

  try {
    const result = await enrichLeadFromSourceLinks(
      parsed.data.sourceLinks,
      parsed.data.rawResearchText,
    );

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
