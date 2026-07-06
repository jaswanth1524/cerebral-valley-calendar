import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadPreviousEventState } from "../src/feed-state.mjs";

async function withTempPublicDir(callback) {
  const dir = await mkdtemp(join(tmpdir(), "calendar-state-"));
  try {
    await callback(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("loadPreviousEventState uses remote state first", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ events: [{ uid: "remote@example.com" }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });

  try {
    await withTempPublicDir(async (publicDir) => {
      await writeFile(join(publicDir, "events.json"), JSON.stringify({ events: [{ uid: "local@example.com" }] }), "utf8");
      const state = await loadPreviousEventState({
        debugFile: "events.json",
        publicDir,
        baseUrl: "https://example.com"
      });

      assert.equal(state.stateSource, "remote");
      assert.deepEqual(state.events, [{ uid: "remote@example.com" }]);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("loadPreviousEventState falls back to local state", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network unavailable");
  };

  try {
    await withTempPublicDir(async (publicDir) => {
      await writeFile(join(publicDir, "events.json"), JSON.stringify({ events: [{ uid: "local@example.com" }] }), "utf8");
      const state = await loadPreviousEventState({
        debugFile: "events.json",
        publicDir,
        baseUrl: "https://example.com"
      });

      assert.equal(state.stateSource, "local");
      assert.deepEqual(state.events, [{ uid: "local@example.com" }]);
      assert.match(state.stateWarning, /remote: network unavailable/);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("loadPreviousEventState returns empty state when no state is available", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("not found", { status: 404 });

  try {
    await withTempPublicDir(async (publicDir) => {
      const state = await loadPreviousEventState({
        debugFile: "events.json",
        publicDir,
        baseUrl: "https://example.com"
      });

      assert.equal(state.stateSource, "empty");
      assert.deepEqual(state.events, []);
      assert.match(state.stateWarning, /remote: remote state returned 404/);
      assert.match(state.stateWarning, /local:/);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
