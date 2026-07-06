import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FEEDS } from "./feeds.mjs";
import { fetchCerebralValleyEvents, filterEventsByLocations } from "./fetch-events.mjs";
import { fetchLumaDiscoveryEvents } from "./fetch-luma-events.mjs";
import { dedupeEvents, mergeEventState, sortEvents } from "./event-utils.mjs";
import { DEFAULT_STATE_BASE_URL, loadPreviousEventState } from "./feed-state.mjs";
import { generateIcs } from "./ics.mjs";
import { buildStatusPayload, writeStatusFiles } from "./status.mjs";

const publicDir = resolve("public");
const RETENTION_DAYS = 30;
const stateBaseUrl = process.env.CALENDAR_STATE_BASE_URL === "" ? null : process.env.CALENDAR_STATE_BASE_URL || DEFAULT_STATE_BASE_URL;

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

function debugPayload({ generatedAt, source, sourceUrl, error, events, state, retentionDays = RETENTION_DAYS }) {
  return `${JSON.stringify(
    {
      generatedAt: generatedAt.toISOString(),
      source,
      sourceUrl,
      error: error || null,
      stateSource: state?.stateSource || null,
      stateUrl: state?.stateUrl || null,
      stateWarning: state?.stateWarning || null,
      retentionDays,
      count: events.length,
      events
    },
    null,
    2
  )}\n`;
}

async function writeFeed({ outputFile, debugFile, events, calendarName, timezone, generatedAt, source, sourceUrl, error, state }) {
  const calendar = generateIcs(events, {
    generatedAt,
    calendarName,
    timezone
  });

  await writeFile(resolve(publicDir, outputFile), calendar, "utf8");
  await writeFile(
    resolve(publicDir, debugFile),
    debugPayload({ generatedAt, source, sourceUrl, error, events, state }),
    "utf8"
  );

  const stateStatus = state?.stateSource ? ` using ${state.stateSource} state` : "";
  const status = error ? ` with ${source} error: ${error}` : "";
  console.log(`Generated ${outputFile} with ${events.length} ${calendarName} events${stateStatus}${status}.`);

  return {
    calendarName,
    source,
    sourceUrl,
    outputFile,
    debugFile,
    count: events.length,
    error: error || null,
    stateSource: state?.stateSource || null,
    stateUrl: state?.stateUrl || null,
    stateWarning: state?.stateWarning || null,
    retentionDays: RETENTION_DAYS
  };
}

async function fetchCerebralValleyEventState(generatedAt) {
  try {
    const events = await fetchCerebralValleyEvents({ now: generatedAt });
    return { events, error: null };
  } catch (error) {
    return { events: [], error: error.message };
  }
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

async function mergeFeedState({ debugFile, source, latestEvents, sourceError, generatedAt }) {
  const state = await loadPreviousEventState({
    debugFile,
    publicDir,
    baseUrl: stateBaseUrl
  });

  if (sourceError && state.stateSource === "empty") {
    throw new Error(`Cannot generate ${debugFile}: ${source} failed and no previous state is available (${state.stateWarning || "no state warning"}).`);
  }

  return {
    events: mergeEventState(state.events, sourceError ? [] : latestEvents, {
      now: generatedAt,
      retentionDays: RETENTION_DAYS
    }),
    state
  };
}

async function main() {
  const generatedAt = new Date();
  const cerebralValleyResult = await fetchCerebralValleyEventState(generatedAt);
  const feedStatuses = [];

  await mkdir(publicDir, { recursive: true });

  for (const feed of FEEDS) {
    const latestCerebralValleyFeedEvents = cerebralValleyResult.error
      ? []
      : sortEvents(filterEventsByLocations(cerebralValleyResult.events, feed.locations));
    const lumaResult = await fetchLumaEventsForFeed(feed, generatedAt);
    const latestLumaFeedEvents = sortEvents(lumaResult.events);
    const cerebralValleyFeedState = await mergeFeedState({
      debugFile: feed.debugFile,
      source: "cerebral-valley",
      latestEvents: latestCerebralValleyFeedEvents,
      sourceError: cerebralValleyResult.error,
      generatedAt
    });
    const lumaFeedState = await mergeFeedState({
      debugFile: prefixedDebugFile("luma", feed),
      source: "luma",
      latestEvents: latestLumaFeedEvents,
      sourceError: lumaResult.error,
      generatedAt
    });
    const cerebralValleyFeedEvents = cerebralValleyFeedState.events;
    const lumaFeedEvents = lumaFeedState.events;
    const combinedFeedEvents = dedupeEvents([...cerebralValleyFeedEvents, ...lumaFeedEvents]);
    const combinedState = {
      stateSource: "derived",
      stateUrl: null,
      stateWarning: "derived from merged Cerebral Valley and Luma source feeds"
    };

    feedStatuses.push(await writeFeed({
      outputFile: feed.outputFile,
      debugFile: feed.debugFile,
      events: cerebralValleyFeedEvents,
      calendarName: feed.calendarName,
      timezone: feed.timezone,
      generatedAt,
      source: "cerebral-valley",
      sourceUrl: "https://cerebralvalley.ai/events",
      error: cerebralValleyResult.error,
      state: cerebralValleyFeedState.state
    }));

    feedStatuses.push(await writeFeed({
      outputFile: prefixedOutputFile("luma", feed),
      debugFile: prefixedDebugFile("luma", feed),
      events: lumaFeedEvents,
      calendarName: lumaCalendarName(feed),
      timezone: feed.timezone,
      generatedAt,
      source: "luma",
      sourceUrl: feed.luma.url,
      error: lumaResult.error,
      state: lumaFeedState.state
    }));

    feedStatuses.push(await writeFeed({
      outputFile: prefixedOutputFile("all", feed),
      debugFile: prefixedDebugFile("all", feed),
      events: combinedFeedEvents,
      calendarName: combinedCalendarName(feed),
      timezone: feed.timezone,
      generatedAt,
      source: "combined",
      sourceUrl: `${feed.luma.url} + https://cerebralvalley.ai/events`,
      error: [cerebralValleyResult.error, lumaResult.error].filter(Boolean).join("; ") || null,
      state: combinedState
    }));
  }

  const status = buildStatusPayload({ generatedAt, feeds: feedStatuses });
  await writeStatusFiles({ publicDir, status });
  console.log(`Generated status.json and index.html for ${status.feedCount} feeds.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
