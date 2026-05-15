import * as cheerio from "cheerio";
import {
  hostnameFor,
  isLikelyPublicHttpUrl,
  normalizeExternalUrl,
} from "@/lib/url-utils";

export type Confidence = "high" | "medium" | "low";

export type Platform =
  | "Instagram"
  | "Google Maps"
  | "Apple Maps"
  | "Yelp"
  | "Facebook"
  | "DoorDash"
  | "Square"
  | "Wix"
  | "GoDaddy"
  | "Business Website";

export type EnrichedField = {
  value: string;
  sourceUrl: string;
  confidence: Confidence;
};

export type ExtractionEvidence = {
  url: string;
  platform: Platform;
  title: string | null;
  description: string | null;
  headings: string[];
  detectedBusiness: string | null;
  detectedNiche: string | null;
  detectedCity: string | null;
  detectedWebsite: string | null;
  detectedEmail: string | null;
  detectedPhoneNumber: string | null;
  textSnippet: string;
};

export type EnrichmentResult = {
  fields: Partial<
    Record<
      | "business"
      | "niche"
      | "city"
      | "website"
      | "email"
      | "phoneNumber"
      | "issueFound"
      | "priority"
      | "googleMaps",
      EnrichedField
    >
  >;
  platforms: Array<{ platform: Platform; url: string }>;
  warnings: string[];
  businessNameCandidates: string[];
  evidence: ExtractionEvidence[];
};

type PageExtraction = {
  url: string;
  platform: Platform;
  title: string | null;
  description: string | null;
  headings: string[];
  text: string;
  links: string[];
  jsonLd: unknown[];
  email: string | null;
  phoneNumber: string | null;
  business: string | null;
  niche: string | null;
  city: string | null;
  website: string | null;
  pageScore: {
    thinContent: boolean;
    noClearServiceInfo: boolean;
    noStrongCallToAction: boolean;
    onePagePlaceholder: boolean;
    genericTemplate: boolean;
    polished: boolean;
  };
};

const instagramLimitedDataMessage =
  "Instagram limits public data. Add a Google Maps, website, Yelp, or Facebook link to improve autofill.";

const thirdPartyPlatforms: Platform[] = [
  "Instagram",
  "Google Maps",
  "Apple Maps",
  "Yelp",
  "Facebook",
  "DoorDash",
];

const confidenceRank: Record<Confidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const commonPersonalNames = new Set([
  "ronnie",
  "john",
  "mike",
  "michael",
  "david",
  "chris",
  "james",
  "robert",
  "william",
  "mark",
  "sarah",
  "jessica",
  "ashley",
  "amanda",
]);

const businessWords = [
  "detailing",
  "detail",
  "floors",
  "flooring",
  "barber",
  "barbershop",
  "salon",
  "lashes",
  "nails",
  "bakery",
  "cafe",
  "restaurant",
  "grill",
  "auto",
  "spa",
  "services",
  "studio",
  "company",
  "co",
  "llc",
];

function detectPlatform(url: string): Platform {
  const host = hostnameFor(url);
  const lowerUrl = url.toLowerCase();

  if (host.includes("instagram.com")) return "Instagram";
  if (
    host.includes("maps.google.") ||
    lowerUrl.includes("google.com/maps") ||
    host.includes("maps.app.goo.gl")
  ) {
    return "Google Maps";
  }
  if (host.includes("maps.apple.com")) return "Apple Maps";
  if (host.includes("yelp.com")) return "Yelp";
  if (host.includes("facebook.com") || host === "fb.com") return "Facebook";
  if (host.includes("doordash.com")) return "DoorDash";
  if (host.includes("square.site") || host.includes("squareup.com")) {
    return "Square";
  }
  if (host.includes("wixsite.com") || host.includes("wix.com")) return "Wix";
  if (host.includes("godaddysites.com") || host.includes("godaddy.com")) {
    return "GoDaddy";
  }

  return "Business Website";
}

function extractUrls(sourceLinks: string) {
  const candidates = sourceLinks
    .split(/[\s,]+/)
    .map((item) => item.trim().replace(/[),.;]+$/, ""))
    .filter(Boolean);

  return Array.from(
    new Set(
      candidates
        .map((candidate) => normalizeExternalUrl(candidate))
        .filter((candidate): candidate is string => Boolean(candidate))
        .filter(isLikelyPublicHttpUrl),
    ),
  ).slice(0, 8);
}

function textOrNull(value: string | undefined | null) {
  const cleaned = value?.replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function flattenJsonLd(value: unknown): unknown[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const graph = record["@graph"];
    return graph ? [value, ...flattenJsonLd(graph)] : [value];
  }
  return [];
}

function readJsonLd($: cheerio.CheerioAPI) {
  const items: unknown[] = [];

  $('script[type="application/ld+json"]').each((_, script) => {
    try {
      const raw = $(script).contents().text();
      items.push(...flattenJsonLd(JSON.parse(raw)));
    } catch {
      // Invalid JSON-LD is common on public pages; ignore it.
    }
  });

  return items;
}

function findJsonString(jsonLd: unknown[], keys: string[]) {
  for (const item of jsonLd) {
    if (!item || typeof item !== "object") continue;

    const record = item as Record<string, unknown>;

    for (const key of keys) {
      const value = record[key];

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  return null;
}

function findJsonCity(jsonLd: unknown[]) {
  for (const item of jsonLd) {
    if (!item || typeof item !== "object") continue;

    const record = item as Record<string, unknown>;
    const address = record.address;

    if (address && typeof address === "object") {
      const locality = (address as Record<string, unknown>).addressLocality;

      if (typeof locality === "string" && locality.trim()) {
        return locality.trim();
      }
    }
  }

  return null;
}

function businessFromTitle(title: string | null, platform: Platform) {
  if (!title) return null;

  if (platform === "Instagram") {
    return cleanInstagramBusinessName(title);
  }

  const separators = [
    " | ",
    " - ",
    " – ",
    " — ",
    " on Instagram",
    " | Facebook",
    " - Yelp",
    " - DoorDash",
  ];

  let cleaned = title;

  for (const separator of separators) {
    if (cleaned.includes(separator)) {
      cleaned = cleaned.split(separator)[0] ?? cleaned;
    }
  }

  cleaned = cleaned
    .replace(/^official\s+/i, "")
    .replace(/\s+\(@.*\)$/i, "")
    .trim();

  if (!cleaned || cleaned.length > 90) return null;
  if (thirdPartyPlatforms.includes(platform) && cleaned.toLowerCase() === platform.toLowerCase()) {
    return null;
  }

  return cleaned;
}

function cleanInstagramBusinessName(title: string) {
  let cleaned = title
    .replace(/instagram photos and videos/gi, "")
    .replace(/instagram photos & videos/gi, "")
    .replace(/photos and videos/gi, "")
    .replace(/photos & videos/gi, "")
    .replace(/\(@[^)]+\)/g, "")
    .replace(/[@•|]+/g, " ")
    .replace(/\s+-\s+instagram\s*$/gi, "")
    .replace(/\s+on instagram\s*$/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  cleaned = cleaned.split(/\s+[•|]\s+/)[0]?.trim() || cleaned;

  if (!cleaned || cleaned.toLowerCase() === "instagram") {
    return null;
  }

  return cleaned;
}

function titleCaseWords(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word.toLowerCase() === "dr") return "Dr.";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function usernameToBusinessCandidates(urlOrText: string) {
  const match =
    urlOrText.match(/instagram\.com\/([^/?#\s]+)/i) ||
    urlOrText.match(/@([a-z0-9._]+)/i);
  const username = match?.[1]?.replace(/[._-]+/g, " ").replace(/\d+/g, "").trim();

  if (!username) return [];

  const candidates = new Set<string>();
  const expanded = username
    .replace(/\bdr\b/i, "Doctor")
    .replace(/\bdoc\b/i, "Doctor");
  candidates.add(titleCaseWords(expanded));

  if (/\bdoctor\b/i.test(expanded)) {
    candidates.add(titleCaseWords(expanded.replace(/\bdoctor\b/i, "Dr.")));
  }

  return Array.from(candidates);
}

function looksLikePersonalName(value: string | null | undefined) {
  const cleaned = value?.trim().toLowerCase();
  if (!cleaned) return false;

  return commonPersonalNames.has(cleaned) || /^[a-z]+$/.test(cleaned);
}

function looksBusinessLike(value: string | null | undefined) {
  const cleaned = value?.toLowerCase() ?? "";
  return businessWords.some((word) => cleaned.includes(word));
}

function inferNicheFromText(...values: Array<string | null | undefined>) {
  const text = values
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const rules: Array<{ niche: string; terms: string[] }> = [
    { niche: "Flooring", terms: ["floors", "flooring", "floor"] },
    { niche: "Barbershop", terms: ["barber", "cuts", "haircut", "hair cuts"] },
    {
      niche: "Auto detailing",
      terms: [
        "detail",
        "detailing",
        "auto spa",
        "car wash",
        "ceramic coating",
        "paint correction",
        "exterior",
        "interior",
      ],
    },
    { niche: "Bakery", terms: ["bakery", "bakes", "cakes", "cupcakes"] },
    {
      niche: "Restaurant",
      terms: ["cafe", "restaurant", "grill", "kitchen", "tacos", "pizza"],
    },
    {
      niche: "Beauty / salon",
      terms: ["salon", "lashes", "nails", "brows", "beauty", "esthetician"],
    },
  ];

  return rules.find((rule) => rule.terms.some((term) => text.includes(term)))?.niche ?? null;
}

function findCityFromText(text: string) {
  const cityRules = [
    { city: "Richmond, VA", terms: ["richmond, va", "richmond va", "richmond"] },
    { city: "Henrico, VA", terms: ["henrico, va", "henrico va", "henrico"] },
    { city: "Glen Allen, VA", terms: ["glen allen, va", "glen allen va", "glen allen"] },
    { city: "Midlothian, VA", terms: ["midlothian, va", "midlo va", "midlothian"] },
  ];
  const lower = text.toLowerCase();

  return cityRules.find((rule) => rule.terms.some((term) => lower.includes(term)))
    ?.city ?? null;
}

function findEmailInText(text: string) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
}

function findPhoneInText(text: string) {
  return (
    text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0] ??
    null
  );
}

function findUrlsInText(text: string) {
  return Array.from(
    new Set(
      Array.from(text.matchAll(/(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s)]*)?/gi))
        .map((match) => normalizeExternalUrl(match[0]))
        .filter((url): url is string => Boolean(url))
        .filter(isLikelyPublicHttpUrl),
    ),
  );
}

function isBookingLink(url: string) {
  const host = hostnameFor(url);
  return [
    "squareup.com",
    "square.site",
    "linktr.ee",
    "linktree.com",
    "calendly.com",
    "glossgenius.com",
    "booksy.com",
    "acuityscheduling.com",
  ].some((domain) => host.includes(domain));
}

function typeFromJsonLd(jsonLd: unknown[]) {
  for (const item of jsonLd) {
    if (!item || typeof item !== "object") continue;

    const type = (item as Record<string, unknown>)["@type"];

    if (typeof type === "string") {
      return type.replace(/([a-z])([A-Z])/g, "$1 $2");
    }

    if (Array.isArray(type)) {
      const first = type.find((value) => typeof value === "string");
      if (typeof first === "string") {
        return first.replace(/([a-z])([A-Z])/g, "$1 $2");
      }
    }
  }

  return null;
}

function nicheFromDescription(description: string | null) {
  if (!description) return null;

  const candidate = description.split(/[.|–—]/)[0]?.trim();

  if (!candidate || candidate.length > 80) {
    return null;
  }

  return candidate;
}

function findEmail($: cheerio.CheerioAPI, text: string, jsonLd: unknown[]) {
  const jsonEmail = findJsonString(jsonLd, ["email"]);
  if (jsonEmail) return jsonEmail;

  const mailto = $('a[href^="mailto:"]').first().attr("href");
  if (mailto) {
    return mailto.replace(/^mailto:/i, "").split("?")[0]?.trim() || null;
  }

  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
}

function findPhone($: cheerio.CheerioAPI, text: string, jsonLd: unknown[]) {
  const jsonPhone = findJsonString(jsonLd, ["telephone", "phone"]);
  if (jsonPhone) return jsonPhone;

  const tel = $('a[href^="tel:"]').first().attr("href");
  if (tel) {
    return tel.replace(/^tel:/i, "").trim() || null;
  }

  return (
    text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0] ??
    null
  );
}

function findOfficialWebsite(
  links: string[],
  sourceUrl: string,
  platform: Platform,
) {
  if (platform === "Business Website" || ["Square", "Wix", "GoDaddy"].includes(platform)) {
    return sourceUrl;
  }

  const sourceHost = hostnameFor(sourceUrl);

  return (
    links.find((link) => {
      const host = hostnameFor(link);
      if (!host || host === sourceHost) return false;

      const detected = detectPlatform(link);
      if (detected !== "Business Website" && detected !== "Square" && detected !== "Wix" && detected !== "GoDaddy") {
        return false;
      }

      return ![
        "google.com",
        "gstatic.com",
        "schema.org",
        "apple.com",
        "facebook.com",
      ].some((blocked) => host.endsWith(blocked));
    }) ?? null
  );
}

function scorePage(text: string, links: string[], platform: Platform) {
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const serviceWords = [
    "services",
    "menu",
    "products",
    "portfolio",
    "gallery",
    "about",
    "pricing",
    "hours",
  ];
  const ctaWords = [
    "book",
    "schedule",
    "call",
    "contact",
    "quote",
    "order",
    "reserve",
    "appointment",
  ];

  const noClearServiceInfo = !serviceWords.some((word) => lower.includes(word));
  const noStrongCallToAction = !ctaWords.some((word) => lower.includes(word));
  const thinContent = wordCount < 140;
  const onePagePlaceholder = thinContent && links.length < 8;
  const genericTemplate =
    ["Square", "Wix", "GoDaddy"].includes(platform) ||
    lower.includes("powered by wix") ||
    lower.includes("powered by godaddy") ||
    lower.includes("square online");
  const polished =
    wordCount > 450 &&
    !noClearServiceInfo &&
    !noStrongCallToAction &&
    links.length >= 12 &&
    !genericTemplate;

  return {
    thinContent,
    noClearServiceInfo,
    noStrongCallToAction,
    onePagePlaceholder,
    genericTemplate,
    polished,
  };
}

async function fetchPublicPage(url: string): Promise<PageExtraction | null> {
  const platform = detectPlatform(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return {
        url,
        platform,
        title: null,
        description: null,
        headings: [],
        text: "",
        links: [],
        jsonLd: [],
        email: null,
        phoneNumber: null,
        business: null,
        niche: null,
        city: null,
        website: platform === "Business Website" ? url : null,
        pageScore: scorePage("", [], platform),
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !contentType.includes("text/html")) {
      return null;
    }

    const html = (await response.text()).slice(0, 900_000);
    const $ = cheerio.load(html);
    const title = textOrNull($("title").first().text());
    const description = textOrNull(
      $('meta[name="description"]').attr("content") ||
        $('meta[property="og:description"]').attr("content"),
    );
    const ogTitle = textOrNull($('meta[property="og:title"]').attr("content"));
    const siteName = textOrNull($('meta[property="og:site_name"]').attr("content"));
    const jsonLd = readJsonLd($);
    const headings = $("h1, h2")
      .map((_, element) => textOrNull($(element).text()))
      .get()
      .filter((value): value is string => Boolean(value))
      .slice(0, 8);

    $("script, style, noscript, svg").remove();
    const text = textOrNull($("body").text()) ?? "";
    const links = $("a[href]")
      .map((_, element) => {
        const href = $(element).attr("href");
        if (!href) return null;
        try {
          return new URL(href, url).toString();
        } catch {
          return null;
        }
      })
      .get()
      .filter((value): value is string => Boolean(value));

    const business =
      findJsonString(jsonLd, ["name", "legalName"]) ||
      siteName ||
      businessFromTitle(ogTitle || title, platform) ||
      (platform === "Instagram"
        ? cleanInstagramBusinessName(headings[0] ?? "")
        : headings[0]) ||
      null;
    const pageScore = scorePage(text, links, platform);
    const inferredNiche = inferNicheFromText(
      business,
      title,
      ogTitle,
      description,
      text.slice(0, 1200),
      url,
    );

    return {
      url,
      platform,
      title,
      description,
      headings,
      text,
      links,
      jsonLd,
      email: findEmail($, text, jsonLd),
      phoneNumber: findPhone($, text, jsonLd),
      business,
      niche: typeFromJsonLd(jsonLd) || inferredNiche || nicheFromDescription(description),
      city: findJsonCity(jsonLd),
      website: findOfficialWebsite(links, url, platform),
      pageScore,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function addCandidate(
  result: EnrichmentResult,
  key: keyof EnrichmentResult["fields"],
  field: EnrichedField | null,
) {
  if (!field?.value) return;

  const existing = result.fields[key];
  if (!existing || confidenceRank[field.confidence] > confidenceRank[existing.confidence]) {
    result.fields[key] = field;
  }
}

function field(value: string | null, sourceUrl: string, confidence: Confidence) {
  if (!value?.trim()) return null;

  return {
    value: value.trim(),
    sourceUrl,
    confidence,
  };
}

function suggestIssueAndPriority(pages: PageExtraction[], platforms: Platform[]) {
  if (pages.length === 0) {
    return {
      issue:
        "Lead has some manual research notes, but no dedicated website was confirmed from the provided sources.",
      priority: "MEDIUM",
      confidence: "low" as Confidence,
      sourceUrl: "Raw Research Text",
    };
  }

  const isInstagramOnly =
    platforms.length > 0 && platforms.every((platform) => platform === "Instagram");
  const foundDedicatedWebsite = pages.some((page) => {
    if (!page.website) return false;

    const platform = detectPlatform(page.website);
    return !thirdPartyPlatforms.includes(platform);
  });
  const hasBusinessWebsite =
    platforms.includes("Business Website") || foundDedicatedWebsite;
  const hasOnlyThirdParty =
    platforms.length > 0 &&
    platforms.every((platform) => thirdPartyPlatforms.includes(platform)) &&
    !foundDedicatedWebsite;
  const builderPlatform = platforms.find((platform) =>
    ["Square", "Wix", "GoDaddy"].includes(platform),
  );
  const bestWebsite =
    pages.find((page) => page.platform === "Business Website") ||
    pages.find((page) => ["Square", "Wix", "GoDaddy"].includes(page.platform));
  const score = bestWebsite?.pageScore;

  if (isInstagramOnly && !foundDedicatedWebsite) {
    return {
      issue:
        "No dedicated website found; business appears to rely mainly on Instagram, which limits control over branding, services, and customer contact flow.",
      priority: "HIGH",
      confidence: "high" as Confidence,
      sourceUrl: pages[0]?.url ?? "",
    };
  }

  if (!hasBusinessWebsite && hasOnlyThirdParty) {
    return {
      issue:
        "Lead appears to rely mainly on third-party pages rather than a dedicated business website.",
      priority: "HIGH",
      confidence: "high" as Confidence,
      sourceUrl: pages[0]?.url ?? "",
    };
  }

  if (builderPlatform === "Square") {
    return {
      issue:
        "Business uses a Square-hosted site; outreach could focus on a more dedicated, branded website.",
      priority: "MEDIUM",
      confidence: "medium" as Confidence,
      sourceUrl: bestWebsite?.url ?? "",
    };
  }

  if (builderPlatform === "Wix" || builderPlatform === "GoDaddy") {
    return {
      issue:
        "Website appears to use a builder-style template and may benefit from stronger branding and polish.",
      priority: "MEDIUM",
      confidence: "medium" as Confidence,
      sourceUrl: bestWebsite?.url ?? "",
    };
  }

  if (score?.onePagePlaceholder) {
    return {
      issue:
        "Website appears very thin or placeholder-like, with limited content for visitors to evaluate the business.",
      priority: "HIGH",
      confidence: "medium" as Confidence,
      sourceUrl: bestWebsite?.url ?? "",
    };
  }

  if (score?.thinContent || score?.noClearServiceInfo) {
    return {
      issue:
        "Website has sparse content and could make service or menu information clearer.",
      priority: "MEDIUM",
      confidence: "medium" as Confidence,
      sourceUrl: bestWebsite?.url ?? "",
    };
  }

  if (score?.noStrongCallToAction) {
    return {
      issue:
        "Website looks functional but could use a clearer call to action for visitors.",
      priority: "MEDIUM",
      confidence: "medium" as Confidence,
      sourceUrl: bestWebsite?.url ?? "",
    };
  }

  if (score?.polished) {
    return {
      issue:
        "Website appears polished and complete; any outreach should focus on refinement rather than major gaps.",
      priority: "LOW",
      confidence: "low" as Confidence,
      sourceUrl: bestWebsite?.url ?? "",
    };
  }

  return {
    issue:
      "Website looks functional but may have room for clearer positioning, stronger presentation, or more polished conversion paths.",
    priority: "LOW",
    confidence: "low" as Confidence,
    sourceUrl: bestWebsite?.url ?? pages[0]?.url ?? "",
  };
}

export async function enrichLeadFromSourceLinks(
  sourceLinks: string,
  rawResearchText = "",
): Promise<EnrichmentResult> {
  const urls = Array.from(
    new Set([...extractUrls(sourceLinks), ...findUrlsInText(rawResearchText)]),
  ).slice(0, 8);
  const rawText = rawResearchText.trim();
  const result: EnrichmentResult = {
    fields: {},
    platforms: urls.map((url) => ({ platform: detectPlatform(url), url })),
    warnings: [],
    businessNameCandidates: [],
    evidence: [],
  };

  const rawTextBusinessCandidates = [
    ...usernameToBusinessCandidates(`${sourceLinks} ${rawText}`),
    ...Array.from(
      rawText.matchAll(/\b(?:business|name|company)\s*:\s*([^\n]+)/gi),
    ).map((match) => textOrNull(match[1]) ?? ""),
  ].filter(Boolean);

  let pages: PageExtraction[] = [];

  if (urls.length > 0) {
    pages = (await Promise.all(urls.map(fetchPublicPage))).filter(
      (page): page is PageExtraction => Boolean(page),
    );
  }
  const isInstagramOnly =
    result.platforms.length > 0 &&
    result.platforms.every((item) => item.platform === "Instagram");

  if (pages.length === 0 && !rawText) {
    result.warnings.push(
      "No public HTML pages could be read from those links. The page may block automated public reads or require JavaScript/login.",
    );
    return result;
  }

  const officialPage =
    pages.find((page) => page.platform === "Business Website") ||
    pages.find((page) => ["Square", "Wix", "GoDaddy"].includes(page.platform));
  const preferredPages = officialPage
    ? [officialPage, ...pages.filter((page) => page.url !== officialPage.url)]
    : pages;

  result.evidence = pages.map((page) => ({
    url: page.url,
    platform: page.platform,
    title: page.title,
    description: page.description,
    headings: page.headings,
    detectedBusiness: page.business,
    detectedNiche: page.niche,
    detectedCity: page.city,
    detectedWebsite: page.website,
    detectedEmail: page.email,
    detectedPhoneNumber: page.phoneNumber,
    textSnippet: page.text.slice(0, 1800),
  }));

  for (const page of preferredPages) {
    const directPageConfidence: Confidence =
      page.platform === "Business Website" ? "high" : "medium";
    addCandidate(result, "business", field(page.business, page.url, directPageConfidence));
    addCandidate(result, "niche", field(page.niche, page.url, "medium"));
    addCandidate(result, "city", field(page.city, page.url, "high"));
    addCandidate(result, "email", field(page.email, page.url, "high"));
    addCandidate(result, "phoneNumber", field(page.phoneNumber, page.url, "high"));
    addCandidate(result, "website", field(page.website, page.url, directPageConfidence));

    if (page.platform === "Google Maps") {
      addCandidate(result, "googleMaps", field(page.url, page.url, "high"));
    }
  }

  const allBusinessCandidates = new Set<string>();
  for (const candidate of rawTextBusinessCandidates) {
    allBusinessCandidates.add(candidate);
  }
  for (const page of pages) {
    if (page.business) allBusinessCandidates.add(page.business);
    for (const candidate of usernameToBusinessCandidates(page.url)) {
      allBusinessCandidates.add(candidate);
    }
  }

  result.businessNameCandidates = Array.from(allBusinessCandidates)
    .map((candidate) => candidate.trim())
    .filter(Boolean)
    .filter((candidate, index, candidates) => candidates.indexOf(candidate) === index)
    .slice(0, 6);

  const bestBusinessCandidate =
    result.businessNameCandidates.find(looksBusinessLike) ??
    result.businessNameCandidates.find((candidate) => !looksLikePersonalName(candidate)) ??
    null;

  const currentBusiness = result.fields.business?.value;
  if (
    bestBusinessCandidate &&
    (!currentBusiness ||
      (isInstagramOnly && looksLikePersonalName(currentBusiness) && looksBusinessLike(bestBusinessCandidate)))
  ) {
    addCandidate(
      result,
      "business",
      field(bestBusinessCandidate, urls[0] ?? "Raw Research Text", "medium"),
    );
  }

  addCandidate(
    result,
    "niche",
    field(
      inferNicheFromText(rawText, sourceLinks, bestBusinessCandidate),
      "Raw Research Text",
      "medium",
    ),
  );
  addCandidate(result, "city", field(findCityFromText(rawText), "Raw Research Text", "medium"));
  addCandidate(result, "email", field(findEmailInText(rawText), "Raw Research Text", "high"));
  addCandidate(
    result,
    "phoneNumber",
    field(findPhoneInText(rawText), "Raw Research Text", "high"),
  );

  const rawUrls = findUrlsInText(rawText);
  const googleMapsUrl = rawUrls.find((url) => detectPlatform(url) === "Google Maps");
  const websiteUrl = rawUrls.find((url) => {
    const platform = detectPlatform(url);
    return (
      platform === "Business Website" ||
      platform === "Square" ||
      platform === "Wix" ||
      platform === "GoDaddy"
    );
  });
  const bookingLink = rawUrls.find(isBookingLink);

  addCandidate(result, "googleMaps", field(googleMapsUrl ?? null, "Raw Research Text", "high"));
  addCandidate(result, "website", field(websiteUrl ?? null, "Raw Research Text", "medium"));

  const foundDedicatedWebsite = pages.some((page) => {
    if (!page.website || page.website === "not found") return false;

    const platform = detectPlatform(page.website);
    return !thirdPartyPlatforms.includes(platform);
  });

  if (isInstagramOnly && !foundDedicatedWebsite) {
    addCandidate(
      result,
      "website",
      field("not found", pages[0]?.url ?? urls[0] ?? "", "high"),
    );
    result.warnings.push(instagramLimitedDataMessage);
  }

  const platforms = result.platforms.map((item) => item.platform);
  const suggestion = suggestIssueAndPriority(pages, platforms);
  const hasBookingLink = Boolean(bookingLink);
  const noDedicatedWebsite =
    !result.fields.website?.value || result.fields.website.value === "not found";
  const issueSuggestion =
    hasBookingLink && noDedicatedWebsite
      ? {
          issue:
            "No dedicated website found; business appears to rely mainly on Instagram and a booking link, which limits control over branding, services, and customer contact flow.",
          priority: "HIGH",
          confidence: "high" as Confidence,
          sourceUrl: bookingLink ?? urls[0] ?? "Raw Research Text",
        }
      : suggestion;
  addCandidate(
    result,
    "issueFound",
    field(issueSuggestion.issue, issueSuggestion.sourceUrl, issueSuggestion.confidence),
  );
  addCandidate(
    result,
    "priority",
    field(issueSuggestion.priority, issueSuggestion.sourceUrl, issueSuggestion.confidence),
  );

  for (const [key, value] of Object.entries(result.fields)) {
    if (value?.confidence === "low") {
      result.warnings.push(
        `${key} was detected with low confidence. Review it before saving.`,
      );
    }
  }

  return result;
}
