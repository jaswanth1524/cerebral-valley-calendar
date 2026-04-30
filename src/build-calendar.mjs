import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fetchCerebralValleyEvents } from "./fetch-events.mjs";
import { generateIcs } from "./ics.mjs";

const outputPath = resolve("public/calendar.ics");
const debugPath = resolve("public/events.json");

async function main() {
  const generatedAt = new Date();
  const events = await fetchCerebralValleyEvents({ now: generatedAt });
  const calendar = generateIcs(events, { generatedAt });

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, calendar, "utf8");
  await writeFile(
    debugPath,
    `${JSON.stringify({ generatedAt: generatedAt.toISOString(), count: events.length, events }, null, 2)}\n`,
    "utf8"
  );

  console.log(`Generated ${outputPath} with ${events.length} SF & Bay Area events.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
