import { isCurrentOrFutureEvent, sortEvents } from "./event-utils.mjs";
import { fetchJson } from "./http.mjs";

const API_URL = "https://api.cerebralvalley.ai/v1/public/event/pull";

const DEFAULT_LIMIT = 100;
const MAX_PAGES = 30;

function toApiDate(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

export function forceUtc(value) {
  if (!value) return null;
  const normalized = String(value)
    .replace(" ", "T")
    .replace(/Z$/, "")
    .replace(/[+-]\d{2}:?\d{0,2}$/, "");
  const date = new Date(`${normalized}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeUrl(value) {
  if (!value) return "https://cerebralvalley.ai/events";
  if (value.startsWith("/")) return `https://cerebralvalley.ai${value}`;
  return value;
}

function normalizeEvent(event) {
  const start = forceUtc(event.startDateTime);
  const end = forceUtc(event.endDateTime);
  const url = normalizeUrl(event.url);

  return {
    id: event.id,
    uid: `${event.id}@cerebralvalley.ai`,
    source: "cerebral-valley",
    sourceName: "Cerebral Valley",
    sourceId: event.id,
    title: event.name || "Cerebral Valley Event",
    description: event.descriptionSummary || event.description || "",
    start,
    end,
    location: event.location || "",
    venue: event.venue || "",
    url,
    canonicalUrl: url,
    type: event.type || "",
    isCerebralValleyEvent: Boolean(event.CVEvent)
  };
}

export function filterEventsByLocations(events, locations) {
  const locationSet = new Set(locations);
  return events.filter((event) => locationSet.has(event.location));
}

export async function fetchCerebralValleyEvents({
  now = new Date(),
  limit = DEFAULT_LIMIT,
  maxPages = MAX_PAGES
} = {}) {
  const events = [];
  let offset = 0;

  for (let page = 0; page < maxPages; page += 1) {
    const params = new URLSearchParams({
      approved: "true",
      startDateTime: toApiDate(now),
      limit: String(limit),
      offset: String(offset)
    });

    const payload = await fetchJson(`${API_URL}?${params}`, {
      headers: {
        accept: "application/json",
        "user-agent": "jaswanth1524/cerebral-valley-calendar"
      },
      errorPrefix: "Cerebral Valley API"
    });

    const pageEvents = Array.isArray(payload.events) ? payload.events : [];
    events.push(...pageEvents);

    offset += pageEvents.length;
    if (pageEvents.length < limit || offset >= Number(payload.totalCount || 0)) {
      break;
    }
  }

  const seen = new Set();
  const uniqueEvents = events
    .map(normalizeEvent)
    .filter((event) => isCurrentOrFutureEvent(event, now))
    .filter((event) => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    });

  return sortEvents(uniqueEvents);
}
