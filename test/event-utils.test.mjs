import test from "node:test";
import assert from "node:assert/strict";
import { canonicalEventUrl, dedupeEvents, isCurrentOrFutureEvent } from "../src/event-utils.mjs";

test("canonicalEventUrl normalizes Luma URLs", () => {
  assert.equal(canonicalEventUrl("http://lu.ma/example?tk=abc#section"), "https://luma.com/example");
  assert.equal(canonicalEventUrl("https://luma.com/example/"), "https://luma.com/example");
});

test("isCurrentOrFutureEvent keeps events that have not ended", () => {
  const now = new Date("2026-07-06T12:00:00.000Z");

  assert.equal(
    isCurrentOrFutureEvent(
      {
        start: "2026-07-06T11:00:00.000Z",
        end: "2026-07-06T13:00:00.000Z"
      },
      now
    ),
    true
  );
  assert.equal(
    isCurrentOrFutureEvent(
      {
        start: "2026-07-06T09:00:00.000Z",
        end: "2026-07-06T10:00:00.000Z"
      },
      now
    ),
    false
  );
});

test("dedupeEvents prefers Luma when URLs match", () => {
  const cerebralValleyEvent = {
    id: "cv-1",
    source: "cerebral-valley",
    title: "AI Meetup",
    start: "2026-07-08T01:00:00.000Z",
    end: "2026-07-08T02:00:00.000Z",
    venue: "AI House",
    location: "San Francisco, CA",
    url: "http://luma.com/ai-meetup"
  };
  const lumaEvent = {
    id: "evt-1",
    source: "luma",
    title: "AI Meetup",
    start: "2026-07-08T01:00:00.000Z",
    end: "2026-07-08T02:00:00.000Z",
    venue: "AI House",
    location: "San Francisco, CA",
    url: "https://luma.com/ai-meetup"
  };

  assert.deepEqual(dedupeEvents([cerebralValleyEvent, lumaEvent]), [lumaEvent]);
});
