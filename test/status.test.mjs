import test from "node:test";
import assert from "node:assert/strict";
import { buildStatusPayload, renderIndexHtml } from "../src/status.mjs";

test("buildStatusPayload summarizes feed health", () => {
  const status = buildStatusPayload({
    generatedAt: new Date("2026-07-06T00:00:00.000Z"),
    feeds: [
      {
        calendarName: "Cerebral Valley SF & Bay Area",
        source: "cerebral-valley",
        sourceUrl: "https://cerebralvalley.ai/events",
        outputFile: "calendar.ics",
        debugFile: "events.json",
        count: 10,
        error: null,
        stateSource: "remote",
        retentionDays: 30
      },
      {
        calendarName: "Luma SF & Bay Area",
        source: "luma",
        sourceUrl: "https://luma.com/sf",
        outputFile: "luma-calendar.ics",
        debugFile: "events-luma.json",
        count: 0,
        error: "Luma API returned 500",
        stateSource: "empty",
        retentionDays: 30
      }
    ]
  });

  assert.equal(status.status, "error");
  assert.equal(status.feedCount, 2);
  assert.equal(status.errorCount, 1);
  assert.equal(status.feeds[0].status, "ok");
  assert.equal(status.feeds[1].status, "error");
});

test("renderIndexHtml includes subscription and debug links", () => {
  const status = buildStatusPayload({
    generatedAt: new Date("2026-07-06T00:00:00.000Z"),
    feeds: [
      {
        calendarName: "Cerebral Valley SF & Bay Area",
        source: "combined",
        outputFile: "all-calendar.ics",
        debugFile: "events-all.json",
        count: 20,
        error: null,
        stateSource: "derived"
      }
    ]
  });

  const html = renderIndexHtml(status);

  assert.match(html, /all-calendar\.ics/);
  assert.match(html, /events-all\.json/);
  assert.match(html, /status\.json/);
});
