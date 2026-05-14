export function normalizeExternalUrl(value: string | null | undefined) {
  const cleaned = value?.trim();

  if (!cleaned) {
    return null;
  }

  if (["not found", "none", "n/a", "na"].includes(cleaned.toLowerCase())) {
    return null;
  }

  const lower = cleaned.toLowerCase();

  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    return isLikelyPublicHttpUrl(cleaned) ? cleaned : null;
  }

  const normalized = `https://${cleaned}`;

  return isLikelyPublicHttpUrl(normalized) ? normalized : null;
}

export function isLikelyPublicHttpUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      host.includes(".") &&
      !["localhost", "127.0.0.1", "0.0.0.0"].includes(host)
    );
  } catch {
    return false;
  }
}

export function hostnameFor(value: string) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}
