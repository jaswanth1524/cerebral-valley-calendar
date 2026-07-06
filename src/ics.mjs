const CALENDAR_NAME = "Cerebral Valley SF & Bay Area";
const CALENDAR_TIMEZONE = "America/Los_Angeles";
const PRODUCT_ID = "-//jaswanth1524//Cerebral Valley Calendar//EN";

function escapeText(value = "") {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function formatUtcDate(value) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function foldLine(line) {
  const chunks = [];
  let remaining = line;

  while (Buffer.byteLength(remaining, "utf8") > 75) {
    let byteCount = 0;
    let index = 0;

    for (const char of remaining) {
      const nextCount = byteCount + Buffer.byteLength(char, "utf8");
      if (nextCount > 75) break;
      byteCount = nextCount;
      index += char.length;
    }

    chunks.push(remaining.slice(0, index));
    remaining = ` ${remaining.slice(index)}`;
  }

  chunks.push(remaining);
  return chunks.join("\r\n");
}

function eventDescription(event) {
  const parts = [
    event.description,
    event.venue ? `Venue: ${event.venue}` : "",
    `Event page: ${event.url}`
  ].filter(Boolean);

  return parts.join("\n\n");
}

function eventToIcs(event, generatedAt) {
  const location = [event.venue, event.location].filter(Boolean).join(", ");
  const url = event.url;

  return [
    "BEGIN:VEVENT",
    `UID:${event.id}@cerebralvalley.ai`,
    `DTSTAMP:${formatUtcDate(generatedAt)}`,
    `DTSTART:${formatUtcDate(event.start)}`,
    `DTEND:${formatUtcDate(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `LOCATION:${escapeText(location)}`,
    `DESCRIPTION:${escapeText(eventDescription(event))}`,
    `URL:${url}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT"
  ];
}

export function generateIcs(
  events,
  {
    generatedAt = new Date(),
    calendarName = CALENDAR_NAME,
    timezone = CALENDAR_TIMEZONE
  } = {}
) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODUCT_ID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    `X-WR-TIMEZONE:${timezone}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
    ...events.flatMap((event) => eventToIcs(event, generatedAt)),
    "END:VCALENDAR"
  ];

  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
