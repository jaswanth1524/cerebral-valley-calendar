import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FEEDS } from "./feeds.mjs";
import { fetchCerebralValleyEvents, filterEventsByLocations } from "./fetch-events.mjs";
import { generateIcs } from "./ics.mjs";

const publicDir = resolve("public");

function feedOutputPath(feed) {
  return resolve(publicDir, feed.outputFile);
}

function feedDebugPath(feed) {
  return resolve(publicDir, feed.debugFile);
}

async function main() {
  const generatedAt = new Date();
  const events = await fetchCerebralValleyEvents({ now: generatedAt });

  await mkdir(publicDir, { recursive: true });

  for (const feed of FEEDS) {
    const feedEvents = filterEventsByLocations(events, feed.locations);
    const calendar = generateIcs(feedEvents, {
      generatedAt,
      calendarName: feed.calendarName,
      timezone: feed.timezone
    });

    await writeFile(feedOutputPath(feed), calendar, "utf8");
    await writeFile(
      feedDebugPath(feed),
      `${JSON.stringify({ generatedAt: generatedAt.toISOString(), count: feedEvents.length, events: feedEvents }, null, 2)}\n`,
      "utf8"
    );

    console.log(`Generated ${feed.outputFile} with ${feedEvents.length} ${feed.calendarName} events.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
