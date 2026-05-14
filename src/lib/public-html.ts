import * as cheerio from "cheerio";

export type PublicPageSummary = {
  title: string | null;
  description: string | null;
};

export function parsePublicPageSummary(html: string): PublicPageSummary {
  const $ = cheerio.load(html);

  return {
    title: $("title").first().text().trim() || null,
    description:
      $('meta[name="description"]').attr("content")?.trim() ||
      $('meta[property="og:description"]').attr("content")?.trim() ||
      null,
  };
}
