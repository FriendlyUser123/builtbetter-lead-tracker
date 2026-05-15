import { NextResponse } from "next/server";
import { z } from "zod";

const OPENAI_RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";

const confidenceSchema = z.enum(["high", "medium", "low"]);
const fieldSchema = z.object({
  value: z.string().catch(""),
  confidence: confidenceSchema.catch("low"),
  reason: z.string().catch(""),
});
const safeFieldSchema = fieldSchema.catch({
  value: "",
  confidence: "low",
  reason: "",
} as const);
const aiOutputSchema = z.object({
  business: safeFieldSchema,
  niche: safeFieldSchema,
  city: safeFieldSchema,
  website: safeFieldSchema,
  email: safeFieldSchema,
  phoneNumber: safeFieldSchema,
  googleMaps: safeFieldSchema,
  issueFound: safeFieldSchema,
  priority: safeFieldSchema,
  warnings: z.array(z.string()).catch([]),
});

const requestSchema = z.object({
  sourceLinks: z.string().optional().default(""),
  rawResearchText: z.string().optional().default(""),
  extraction: z.unknown().optional(),
  currentValues: z.unknown().optional(),
});

type AiDebug = {
  endpoint: string;
  enabled: boolean;
  hasApiKey: boolean;
  hasModel: boolean;
  model?: string;
  status?: number;
  category?: string;
  apiErrorCode?: string;
  apiErrorType?: string;
};

function logAiIssue(message: string, details: Record<string, unknown>) {
  console.error("[AI enrichment]", message, details);
}

function disabledResponse(message: string, debug: AiDebug) {
  logAiIssue(message, debug);

  return NextResponse.json({
    enabled: false,
    message,
    suggestions: null,
    debug,
  });
}

function getApiErrorDetails(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { message: "", code: "", type: "" };
  }

  const error = (payload as { error?: unknown }).error;

  if (!error || typeof error !== "object") {
    return { message: "", code: "", type: "" };
  }

  const record = error as Record<string, unknown>;

  return {
    message: typeof record.message === "string" ? record.message : "",
    code: typeof record.code === "string" ? record.code : "",
    type: typeof record.type === "string" ? record.type : "",
  };
}

function categoryForOpenAiError(status: number, errorMessage: string) {
  const lower = errorMessage.toLowerCase();

  if (status === 401) return "missing-or-invalid-api-key";
  if (status === 403) return "permission-issue";
  if (status === 404 || lower.includes("model")) return "invalid-or-unavailable-model";
  if (status === 429 && lower.includes("billing")) return "billing-or-credit-issue";
  if (status === 429) return "rate-limit-or-quota-issue";
  if (status === 400) return "invalid-request-body";
  if (status >= 500) return "openai-server-error";

  return "openai-request-failed";
}

function friendlyMessageForOpenAiError(status: number, apiMessage: string) {
  const category = categoryForOpenAiError(status, apiMessage);

  const friendly: Record<string, string> = {
    "missing-or-invalid-api-key":
      "OpenAI rejected the API key. Check AI_API_KEY and restart the dev server.",
    "permission-issue":
      "OpenAI returned a permission error. Check that your key has access to the selected model.",
    "invalid-or-unavailable-model":
      "The configured AI_MODEL may be invalid or unavailable for this key.",
    "billing-or-credit-issue":
      "OpenAI reported a billing or credit issue for this key.",
    "rate-limit-or-quota-issue":
      "OpenAI reported a rate limit or quota issue.",
    "invalid-request-body":
      "OpenAI rejected the AI Review request body.",
    "openai-server-error":
      "OpenAI returned a server error. Try again in a bit.",
    "openai-request-failed": "OpenAI rejected the AI Review request.",
  };

  return `${friendly[category]}${apiMessage ? ` (${apiMessage})` : ""}`;
}

function leadFieldSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["value", "confidence", "reason"],
    properties: {
      value: { type: "string" },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      reason: { type: "string" },
    },
  };
}

function aiJsonSchema() {
  const field = leadFieldSchema();

  return {
    type: "object",
    additionalProperties: false,
    required: [
      "business",
      "niche",
      "city",
      "website",
      "email",
      "phoneNumber",
      "googleMaps",
      "issueFound",
      "priority",
      "warnings",
    ],
    properties: {
      business: field,
      niche: field,
      city: field,
      website: field,
      email: field,
      phoneNumber: field,
      googleMaps: field,
      issueFound: field,
      priority: field,
      warnings: {
        type: "array",
        items: { type: "string" },
      },
    },
  };
}

function buildInstructions() {
  return [
    "You are a careful lead enrichment verifier for a local-first CRM.",
    "Use only the provided evidence. Do not invent facts.",
    "Return structured JSON matching the schema.",
    "Prefer official business website data over third-party directory data.",
    "Prefer business-specific names over platform names such as Square, Instagram, Yelp, Facebook, DoorDash, GoDaddy, or Wix.",
    "Never use 'Square Booking Flow' as the business name unless the business itself is clearly called that.",
    "Treat Square, Linktree, Calendly, Booksy, and similar URLs as booking/link hubs, not dedicated websites.",
    "If uncertain, use an empty string, 'not found', or low confidence.",
  ].join("\n");
}

function buildInput(input: z.infer<typeof requestSchema>) {
  return JSON.stringify(
    {
      task:
        "Review the raw extractor output and return cleaner structured lead suggestions. For Instagram leads, if a display name looks like a personal name but username/bio suggests a business, prefer the business-like name. For doctordetailing3-style evidence, likely names are Doctor Detailing or Dr. Detailing, not Ronnie and not Square Booking Flow. If Instagram plus Square booking exists but no official branded website exists, website should be 'not found' or 'booking link only', and issueFound should naturally explain that there is a booking link but no dedicated branded website.",
      requiredOutputShape: {
        business: { value: "", confidence: "high|medium|low", reason: "" },
        niche: { value: "", confidence: "high|medium|low", reason: "" },
        city: { value: "", confidence: "high|medium|low", reason: "" },
        website: { value: "", confidence: "high|medium|low", reason: "" },
        email: { value: "", confidence: "high|medium|low", reason: "" },
        phoneNumber: { value: "", confidence: "high|medium|low", reason: "" },
        googleMaps: { value: "", confidence: "high|medium|low", reason: "" },
        issueFound: { value: "", confidence: "high|medium|low", reason: "" },
        priority: { value: "High|Medium|Low", confidence: "high|medium|low", reason: "" },
        warnings: [],
      },
      sourceLinks: input.sourceLinks,
      rawResearchText: input.rawResearchText,
      extraction: input.extraction,
      currentValues: input.currentValues,
    },
    null,
    2,
  );
}

function extractResponseText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.output_text === "string") {
    return record.output_text;
  }

  const output = Array.isArray(record.output) ? record.output : [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;

    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;

    for (const part of content) {
      if (!part || typeof part !== "object") continue;

      const partRecord = part as Record<string, unknown>;
      if (
        partRecord.type === "output_text" &&
        typeof partRecord.text === "string"
      ) {
        return partRecord.text;
      }
    }
  }

  return "";
}

function extractJsonObject(value: string) {
  const firstBrace = value.indexOf("{");
  const lastBrace = value.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return value;
  }

  return value.slice(firstBrace, lastBrace + 1);
}

export async function POST(request: Request) {
  const enabled = process.env.AI_ENRICHMENT_ENABLED === "true";
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  const baseDebug: AiDebug = {
    endpoint: OPENAI_RESPONSES_ENDPOINT,
    enabled,
    hasApiKey: Boolean(apiKey),
    hasModel: Boolean(model),
    model,
  };

  if (!enabled) {
    return disabledResponse("AI enrichment is disabled.", {
      ...baseDebug,
      category: "ai-enrichment-disabled",
    });
  }

  if (!apiKey) {
    return disabledResponse("AI_API_KEY is missing.", {
      ...baseDebug,
      category: "missing-api-key",
    });
  }

  if (!model) {
    return disabledResponse("AI_MODEL is missing.", {
      ...baseDebug,
      category: "missing-model",
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    logAiIssue("Invalid AI enrichment request body.", {
      ...baseDebug,
      category: "invalid-local-request",
    });

    return NextResponse.json(
      {
        enabled: true,
        suggestions: null,
        message: "The app sent an invalid AI Review request.",
        debug: { ...baseDebug, category: "invalid-local-request" },
      },
      { status: 200 },
    );
  }

  try {
    const response = await fetch(OPENAI_RESPONSES_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: buildInstructions(),
        input: buildInput(parsed.data),
        temperature: 0.1,
        max_output_tokens: 1600,
        text: {
          format: {
            type: "json_schema",
            name: "lead_enrichment_suggestions",
            schema: aiJsonSchema(),
            strict: true,
          },
        },
      }),
    });

    const responseText = await response.text();
    let responsePayload: unknown = null;

    try {
      responsePayload = responseText ? JSON.parse(responseText) : null;
    } catch {
      responsePayload = {
        error: {
          message: responseText.slice(0, 600),
          code: "non_json_response",
          type: "non_json_response",
        },
      };
    }

    if (!response.ok) {
      const apiError = getApiErrorDetails(responsePayload);
      const category = categoryForOpenAiError(response.status, apiError.message);
      const debug = {
        ...baseDebug,
        status: response.status,
        category,
        apiErrorCode: apiError.code,
        apiErrorType: apiError.type,
      };

      logAiIssue("OpenAI Responses API request failed.", {
        ...debug,
        apiErrorMessage: apiError.message,
      });

      return NextResponse.json(
        {
          enabled: true,
          suggestions: null,
          message: friendlyMessageForOpenAiError(response.status, apiError.message),
          debug,
        },
        { status: 200 },
      );
    }

    const content = extractResponseText(responsePayload);

    if (!content) {
      logAiIssue("OpenAI response did not include output text.", {
        ...baseDebug,
        category: "missing-output-text",
      });

      return NextResponse.json({
        enabled: true,
        suggestions: null,
        message: "OpenAI responded, but no output text was returned.",
        debug: { ...baseDebug, category: "missing-output-text" },
      });
    }

    const json = JSON.parse(extractJsonObject(content));
    const suggestions = aiOutputSchema.parse(json);

    return NextResponse.json({
      enabled: true,
      suggestions,
      message: "",
      debug: { ...baseDebug, status: response.status, category: "ok" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI error.";

    logAiIssue("AI enrichment failed before a usable response was produced.", {
      ...baseDebug,
      category: "local-ai-route-error",
      errorMessage: message,
    });

    return NextResponse.json(
      {
        enabled: true,
        suggestions: null,
        message: `AI Review failed inside the app route: ${message}`,
        debug: { ...baseDebug, category: "local-ai-route-error" },
      },
      { status: 200 },
    );
  }
}
