export function isCurrentOrFutureEvent(event, now = new Date()) {
  if (!event.start || !event.end) return false;
  return new Date(event.end).getTime() >= now.getTime();
}

export function sortEvents(events) {
  return [...events].sort((left, right) => new Date(left.start) - new Date(right.start));
}

export function canonicalEventUrl(value) {
  if (!value) return "";

  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    if (url.hostname === "luma.com" || url.hostname === "lu.ma") {
      url.protocol = "https:";
      url.hostname = "luma.com";
    }

    return `${url.origin}${url.pathname.replace(/\/$/, "")}`.toLowerCase();
  } catch {
    return String(value).trim().replace(/\/$/, "").toLowerCase();
  }
}

function normalizeMetadata(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function metadataKey(event) {
  return [
    normalizeMetadata(event.title),
    event.start ? new Date(event.start).toISOString() : "",
    normalizeMetadata(event.venue || event.location)
  ].join("|");
}

function dedupeKeys(event) {
  const keys = [];
  const url = canonicalEventUrl(event.canonicalUrl || event.url);
  if (url) keys.push(`url:${url}`);

  const metadata = metadataKey(event);
  if (!metadata.startsWith("||")) keys.push(`metadata:${metadata}`);

  return keys;
}

function shouldReplaceEvent(existing, candidate) {
  if (candidate.source === "luma" && existing.source !== "luma") return true;
  if ((candidate.description || "").length > (existing.description || "").length) return true;
  return false;
}

export function dedupeEvents(events) {
  const deduped = [];

  for (const event of events) {
    const keys = dedupeKeys(event);
    const index = deduped.findIndex((existing) => {
      const existingKeys = new Set(dedupeKeys(existing));
      return keys.some((key) => existingKeys.has(key));
    });

    if (index === -1) {
      deduped.push(event);
    } else if (shouldReplaceEvent(deduped[index], event)) {
      deduped[index] = event;
    }
  }

  return sortEvents(deduped);
}
