const API_URL = "https://api.cerebralvalley.ai/v1/public/event/pull";

export const BAY_AREA_LOCATIONS = new Set([
  "San Francisco, CA",
  "San Jose, CA",
  "Hillsborough, CA",
  "Stanford, CA",
  "Los Altos, CA",
  "Oakland, CA",
  "Palo Alto, CA",
  "Pleasanton, CA",
  "Mountain View, CA",
  "Sunnyvale, CA",
  "Berkeley, CA",
  "San Mateo, CA",
  "Menlo Park, CA",
  "Cupertino, CA",
  "Santa Clara, CA",
  "Campbell, CA"
]);

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

  return {
    id: event.id,
    title: event.name || "Cerebral Valley Event",
    description: event.descriptionSummary || event.description || "",
    start,
    end,
    location: event.location || "",
    venue: event.venue || "",
    url: normalizeUrl(event.url),
    type: event.type || "",
    isCerebralValleyEvent: Boolean(event.CVEvent)
  };
}

export function isBayAreaEvent(event) {
  return BAY_AREA_LOCATIONS.has(event.location);
}

export function isCurrentOrFutureEvent(event, now = new Date()) {
  if (!event.start || !event.end) return false;
  return new Date(event.end).getTime() >= now.getTime();
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

    const response = await fetch(`${API_URL}?${params}`, {
      headers: {
        accept: "application/json",
        "user-agent": "jaswanth1524/cerebral-valley-calendar"
      }
    });

    if (!response.ok) {
      let message = `Cerebral Valley API returned ${response.status}`;
      try {
        const payload = await response.json();
        message = payload.detail || message;
      } catch {
        // Keep the status-based message when the response body is not JSON.
      }
      throw new Error(message);
    }

    const payload = await response.json();
    const pageEvents = Array.isArray(payload.events) ? payload.events : [];
    events.push(...pageEvents);

    offset += pageEvents.length;
    if (pageEvents.length < limit || offset >= Number(payload.totalCount || 0)) {
      break;
    }
  }

  const seen = new Set();
  return events
    .map(normalizeEvent)
    .filter((event) => isCurrentOrFutureEvent(event, now))
    .filter(isBayAreaEvent)
    .filter((event) => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    })
    .sort((left, right) => new Date(left.start) - new Date(right.start));
}
