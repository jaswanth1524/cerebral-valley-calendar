import test from "node:test";
import assert from "node:assert/strict";
import { generateIcs } from "../src/ics.mjs";

test("generateIcs escapes text and folds long lines", () => {
  const calendar = generateIcs(
    [
      {
        uid: "event@example.com",
        id: "event",
        sourceName: "Test",
        title: `A, B; C\\D
Next with a very long title that should fold across multiple iCalendar lines without exceeding byte limits`,
        description: "Description, with; punctuation\\and a newline\ninside.",
        start: "2026-07-08T01:00:00.000Z",
        end: "2026-07-08T02:00:00.000Z",
        location: "San Francisco, CA",
        venue: "AI House",
        url: "https://example.com/event"
      }
    ],
    { generatedAt: new Date("2026-07-06T00:00:00.000Z") }
  );

  const unfoldedCalendar = calendar.replace(/\r\n /g, "");

  assert.match(unfoldedCalendar, /SUMMARY:A\\, B\\; C\\\\D\\nNext/);
  assert.match(unfoldedCalendar, /DESCRIPTION:Source: Test\\n\\nDescription\\, with\\; punctuation\\\\and a newline\\ninside/);

  const foldedLines = calendar.split("\r\n").filter(Boolean);
  assert.ok(foldedLines.every((line) => Buffer.byteLength(line, "utf8") <= 75));
});
