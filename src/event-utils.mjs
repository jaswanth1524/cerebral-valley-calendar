export function isCurrentOrFutureEvent(event, now = new Date()) {
  if (!hasValidEventWindow(event)) return false;
  return new Date(event.end).getTime() >= now.getTime();
}

function dateTime(value) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function dateIso(value) {
  const time = dateTime(value);
  return time === null ? "" : new Date(time).toISOString();
}

export function hasValidEventWindow(event) {
  return Boolean(event?.start && event?.end && dateTime(event.start) !== null && dateTime(event.end) !== null);
}

export function sortEvents(events) {
  return [...events].sort((left, right) => {
    const leftStart = dateTime(left.start) ?? Number.POSITIVE_INFINITY;
    const rightStart = dateTime(right.start) ?? Number.POSITIVE_INFINITY;
    return leftStart - rightStart;
  });
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
    dateIso(event.start),
    normalizeMetadata(event.venue || event.location)
  ].join("|");
}

export function eventIdentityKeys(event) {
  const keys = [];
  if (event.uid) keys.push(`uid:${event.uid}`);
  if (event.source && event.sourceId) keys.push(`source:${event.source}:${event.sourceId}`);

  const url = canonicalEventUrl(event.canonicalUrl || event.url);
  if (url) keys.push(`url:${url}`);

  const metadata = metadataKey(event);
  if (metadata.replace(/\|/g, "")) keys.push(`metadata:${metadata}`);

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
    const keys = eventIdentityKeys(event);
    const index = deduped.findIndex((existing) => {
      const existingKeys = new Set(eventIdentityKeys(existing));
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

function retentionCutoff(now, retentionDays) {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - retentionDays);
  return cutoff;
}

export function isWithinRetentionWindow(event, now = new Date(), retentionDays = 30) {
  if (!event.end) return false;
  const end = new Date(event.end);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() >= retentionCutoff(now, retentionDays).getTime();
}

export function mergeEventState(previousEvents, latestEvents, { now = new Date(), retentionDays = 30 } = {}) {
  const merged = [];

  for (const event of previousEvents) {
    if (hasValidEventWindow(event) && isWithinRetentionWindow(event, now, retentionDays)) {
      merged.push(event);
    }
  }

  for (const event of latestEvents) {
    if (!hasValidEventWindow(event) || !isWithinRetentionWindow(event, now, retentionDays)) continue;

    const keys = eventIdentityKeys(event);
    const index = merged.findIndex((existing) => {
      const existingKeys = new Set(eventIdentityKeys(existing));
      return keys.some((key) => existingKeys.has(key));
    });

    if (index === -1) {
      merged.push(event);
    } else {
      merged[index] = event;
    }
  }

  return sortEvents(merged);
}
