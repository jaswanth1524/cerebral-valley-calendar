import test from "node:test";
import assert from "node:assert/strict";
import { fetchJson } from "../src/http.mjs";

test("fetchJson retries transient failures", async () => {
  let attempts = 0;

  const payload = await fetchJson("https://example.com/events", {
    errorPrefix: "Example API",
    retryDelayMs: 0,
    fetchImpl: async () => {
      attempts += 1;
      if (attempts === 1) {
        return new Response(JSON.stringify({ message: "temporary failure" }), { status: 500 });
      }
      return new Response(JSON.stringify({ events: [{ id: "event-1" }] }), { status: 200 });
    }
  });

  assert.equal(attempts, 2);
  assert.deepEqual(payload, { events: [{ id: "event-1" }] });
});

test("fetchJson does not retry non-transient statuses", async () => {
  let attempts = 0;

  await assert.rejects(
    fetchJson("https://example.com/missing", {
      errorPrefix: "Example API",
      retryDelayMs: 0,
      fetchImpl: async () => {
        attempts += 1;
        return new Response("missing", { status: 404 });
      }
    }),
    /Example API returned 404/
  );

  assert.equal(attempts, 1);
});

test("fetchJson aborts timed out requests", async () => {
  await assert.rejects(
    fetchJson("https://example.com/slow", {
      errorPrefix: "Slow API",
      retries: 0,
      timeoutMs: 1,
      retryDelayMs: 0,
      fetchImpl: async (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        })
    }),
    /Slow API timed out after 1ms/
  );
});
