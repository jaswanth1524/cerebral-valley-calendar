import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalEventUrl,
  dedupeEvents,
  eventIdentityKeys,
  isCurrentOrFutureEvent,
  isWithinRetentionWindow,
  mergeEventState
} from "../src/event-utils.mjs";

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

test("mergeEventState appends new events", () => {
  const previous = [
    {
      uid: "old@example.com",
      title: "Old",
      start: "2026-07-07T01:00:00.000Z",
      end: "2026-07-07T02:00:00.000Z",
      url: "https://example.com/old"
    }
  ];
  const latest = [
    {
      uid: "new@example.com",
      title: "New",
      start: "2026-07-08T01:00:00.000Z",
      end: "2026-07-08T02:00:00.000Z",
      url: "https://example.com/new"
    }
  ];

  assert.deepEqual(
    mergeEventState(previous, latest, { now: new Date("2026-07-06T00:00:00.000Z") }).map((event) => event.uid),
    ["old@example.com", "new@example.com"]
  );
});

test("mergeEventState replaces matching saved events", () => {
  const previous = [
    {
      uid: "same@example.com",
      source: "luma",
      sourceId: "evt-1",
      title: "Old title",
      description: "Old",
      start: "2026-07-08T01:00:00.000Z",
      end: "2026-07-08T02:00:00.000Z",
      url: "https://luma.com/same"
    }
  ];
  const latest = [
    {
      uid: "same@example.com",
      source: "luma",
      sourceId: "evt-1",
      title: "New title",
      description: "New",
      start: "2026-07-08T01:00:00.000Z",
      end: "2026-07-08T03:00:00.000Z",
      url: "https://luma.com/same"
    }
  ];

  assert.deepEqual(mergeEventState(previous, latest, { now: new Date("2026-07-06T00:00:00.000Z") }), latest);
});

test("mergeEventState keeps recent ended events and prunes old ended events", () => {
  const now = new Date("2026-07-31T00:00:00.000Z");
  const previous = [
    {
      uid: "recent@example.com",
      title: "Recent",
      start: "2026-07-05T01:00:00.000Z",
      end: "2026-07-05T02:00:00.000Z",
      url: "https://example.com/recent"
    },
    {
      uid: "old@example.com",
      title: "Old",
      start: "2026-06-01T01:00:00.000Z",
      end: "2026-06-01T02:00:00.000Z",
      url: "https://example.com/old"
    }
  ];

  assert.equal(isWithinRetentionWindow(previous[0], now, 30), true);
  assert.equal(isWithinRetentionWindow(previous[1], now, 30), false);
  assert.deepEqual(mergeEventState(previous, [], { now, retentionDays: 30 }).map((event) => event.uid), ["recent@example.com"]);
});

test("mergeEventState skips malformed saved events", () => {
  const previous = [
    {
      uid: "bad@example.com",
      title: "Bad",
      start: "not-a-date",
      end: "2026-07-07T02:00:00.000Z",
      url: "https://example.com/bad"
    }
  ];
  const latest = [
    {
      uid: "good@example.com",
      title: "Good",
      start: "2026-07-08T01:00:00.000Z",
      end: "2026-07-08T02:00:00.000Z",
      url: "https://example.com/good"
    }
  ];

  assert.deepEqual(
    mergeEventState(previous, latest, { now: new Date("2026-07-06T00:00:00.000Z") }).map((event) => event.uid),
    ["good@example.com"]
  );
  assert.deepEqual(eventIdentityKeys(previous[0]), ["uid:bad@example.com", "url:https://example.com/bad", "metadata:bad||"]);
});
