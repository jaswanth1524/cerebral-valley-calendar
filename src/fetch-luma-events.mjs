import { isCurrentOrFutureEvent, sortEvents } from "./event-utils.mjs";

const API_BASE_URL = "https://api.lu.ma";
const DEFAULT_LIMIT = 25;
const MAX_PAGES = 8;
const DETAIL_CONCURRENCY = 5;
const USER_AGENT = "jaswanth1524/cerebral-valley-calendar";

function normalizeUrl(value) {
  if (!value) return "https://luma.com";
  if (/^https?:\/\//i.test(value)) return value.replace(/^http:\/\//i, "https://");
  return `https://luma.com/${String(value).replace(/^\/+/, "")}`;
}

function lumaSlug(value) {
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) return String(value).replace(/^\/+/, "");

  try {
    return new URL(value).pathname.replace(/^\/+/, "").split("/")[0] || "";
  } catch {
    return "";
  }
}

function geoLocation(event) {
  const geo = event.geo_address_info || {};
  if (event.location_type === "online") return "Online";
  if (geo.city_state) return geo.city_state;
  if (geo.city && geo.region_short) return `${geo.city}, ${geo.region_short}`;
  if (geo.city && geo.region) return `${geo.city}, ${geo.region}`;
  return "";
}

function geoVenue(event) {
  const geo = event.geo_address_info || {};
  if (event.location_type === "online") return "Online";
  return geo.address || geo.short_address || "";
}

function descriptionNodeText(node) {
  if (!node) return "";
  if (typeof node.text === "string") return node.text;
  if (node.type === "hard_break") return "\n";

  const children = Array.isArray(node.content) ? node.content.map(descriptionNodeText).join("") : "";
  if (["paragraph", "heading", "list_item"].includes(node.type)) return `${children}\n`;
  return children;
}

function descriptionMirrorText(descriptionMirror) {
  if (!descriptionMirror?.content) return "";
  return descriptionMirror.content
    .map(descriptionNodeText)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": USER_AGENT
    }
  });

  if (!response.ok) {
    let message = `Luma API returned ${response.status}`;
    try {
      const payload = await response.json();
      message = payload.message || payload.detail || message;
    } catch {
      // Keep the status-based message when the response body is not JSON.
    }
    throw new Error(message);
  }

  return response.json();
}

async function fetchLumaEventDetail(entry) {
  const event = entry.event || entry;
  const slug = lumaSlug(event.url);
  if (!slug) return entry;

  const params = new URLSearchParams({ event_api_id: slug });
  try {
    return await fetchJson(`${API_BASE_URL}/event/get?${params}`);
  } catch {
    return entry;
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function normalizeLumaEvent(record, fallbackRecord = {}) {
  const event = record.event || fallbackRecord.event || record;
  const calendar = record.calendar || fallbackRecord.calendar || {};
  const hosts = record.hosts || fallbackRecord.hosts || [];
  const url = normalizeUrl(event.url);
  const hostNames = hosts.map((host) => host.name).filter(Boolean);
  const description = descriptionMirrorText(record.description_mirror) || calendar.description_short || "";

  return {
    id: event.api_id,
    uid: `${event.api_id}@luma.com`,
    source: "luma",
    sourceName: "Luma",
    sourceId: event.api_id,
    title: event.name || "Luma Event",
    description,
    start: event.start_at ? new Date(event.start_at).toISOString() : null,
    end: event.end_at ? new Date(event.end_at).toISOString() : null,
    location: geoLocation(event),
    venue: geoVenue(event),
    url,
    canonicalUrl: url,
    type: event.event_type || "",
    calendarName: calendar.name || "",
    hosts: hostNames
  };
}

export async function fetchLumaDiscoveryEvents({
  discoverPlaceApiId,
  now = new Date(),
  limit = DEFAULT_LIMIT,
  maxPages = MAX_PAGES,
  detailConcurrency = DETAIL_CONCURRENCY
} = {}) {
  if (!discoverPlaceApiId) {
    throw new Error("Missing Luma discovery place API id.");
  }

  const entries = [];
  let cursor = null;

  for (let page = 0; page < maxPages; page += 1) {
    const params = new URLSearchParams({
      discover_place_api_id: discoverPlaceApiId,
      pagination_limit: String(limit)
    });
    if (cursor) params.set("pagination_cursor", cursor);

    const payload = await fetchJson(`${API_BASE_URL}/discover/get-paginated-events?${params}`);
    const pageEntries = Array.isArray(payload.entries) ? payload.entries : [];
    entries.push(...pageEntries);

    cursor = payload.next_cursor || null;
    if (!payload.has_more || !cursor || pageEntries.length === 0) break;
  }

  const detailRecords = await mapWithConcurrency(entries, detailConcurrency, fetchLumaEventDetail);
  const seen = new Set();

  const events = detailRecords
    .map((record, index) => normalizeLumaEvent(record, entries[index]))
    .filter((event) => isCurrentOrFutureEvent(event, now))
    .filter((event) => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    });

  return sortEvents(events);
}
