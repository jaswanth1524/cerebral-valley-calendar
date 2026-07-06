import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FEEDS } from "./feeds.mjs";
import { fetchCerebralValleyEvents, filterEventsByLocations } from "./fetch-events.mjs";
import { fetchLumaDiscoveryEvents } from "./fetch-luma-events.mjs";
import { dedupeEvents, sortEvents } from "./event-utils.mjs";
import { generateIcs } from "./ics.mjs";

const publicDir = resolve("public");

function prefixedOutputFile(prefix, feed) {
  return `${prefix}-${feed.outputFile}`;
}

function prefixedDebugFile(prefix, feed) {
  return feed.slug === "bay-area" ? `events-${prefix}.json` : `events-${prefix}-${feed.slug}.json`;
}

function metroName(feed) {
  return feed.calendarName.replace(/^Cerebral Valley /, "");
}

function lumaCalendarName(feed) {
  return `Luma ${metroName(feed)}`;
}

function combinedCalendarName(feed) {
  return `Cerebral Valley + Luma ${metroName(feed)}`;
}

function debugPayload({ generatedAt, source, sourceUrl, error, events }) {
  return `${JSON.stringify(
    {
      generatedAt: generatedAt.toISOString(),
      source,
      sourceUrl,
      error: error || null,
      count: events.length,
      events
    },
    null,
    2
  )}\n`;
}

async function writeFeed({ outputFile, debugFile, events, calendarName, timezone, generatedAt, source, sourceUrl, error }) {
  const calendar = generateIcs(events, {
    generatedAt,
    calendarName,
    timezone
  });

  await writeFile(resolve(publicDir, outputFile), calendar, "utf8");
  await writeFile(
    resolve(publicDir, debugFile),
    debugPayload({ generatedAt, source, sourceUrl, error, events }),
    "utf8"
  );

  const status = error ? ` with ${source} error: ${error}` : "";
  console.log(`Generated ${outputFile} with ${events.length} ${calendarName} events${status}.`);
}

async function fetchLumaEventsForFeed(feed, generatedAt) {
  try {
    const events = await fetchLumaDiscoveryEvents({
      discoverPlaceApiId: feed.luma.discoverPlaceApiId,
      now: generatedAt
    });
    return { events, error: null };
  } catch (error) {
    return { events: [], error: error.message };
  }
}

async function main() {
  const generatedAt = new Date();
  const cerebralValleyEvents = await fetchCerebralValleyEvents({ now: generatedAt });

  await mkdir(publicDir, { recursive: true });

  for (const feed of FEEDS) {
    const cerebralValleyFeedEvents = sortEvents(filterEventsByLocations(cerebralValleyEvents, feed.locations));
    const lumaResult = await fetchLumaEventsForFeed(feed, generatedAt);
    const lumaFeedEvents = sortEvents(lumaResult.events);
    const combinedFeedEvents = dedupeEvents([...cerebralValleyFeedEvents, ...lumaFeedEvents]);

    await writeFeed({
      outputFile: feed.outputFile,
      debugFile: feed.debugFile,
      events: cerebralValleyFeedEvents,
      calendarName: feed.calendarName,
      timezone: feed.timezone,
      generatedAt,
      source: "cerebral-valley",
      sourceUrl: "https://cerebralvalley.ai/events"
    });

    await writeFeed({
      outputFile: prefixedOutputFile("luma", feed),
      debugFile: prefixedDebugFile("luma", feed),
      events: lumaFeedEvents,
      calendarName: lumaCalendarName(feed),
      timezone: feed.timezone,
      generatedAt,
      source: "luma",
      sourceUrl: feed.luma.url,
      error: lumaResult.error
    });

    await writeFeed({
      outputFile: prefixedOutputFile("all", feed),
      debugFile: prefixedDebugFile("all", feed),
      events: combinedFeedEvents,
      calendarName: combinedCalendarName(feed),
      timezone: feed.timezone,
      generatedAt,
      source: "combined",
      sourceUrl: `${feed.luma.url} + https://cerebralvalley.ai/events`,
      error: lumaResult.error
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
