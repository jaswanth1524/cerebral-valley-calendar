import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function feedStatus(feed) {
  return feed.error ? "error" : "ok";
}

export function buildStatusPayload({ generatedAt = new Date(), feeds = [] } = {}) {
  const normalizedFeeds = feeds.map((feed) => ({
    calendarName: feed.calendarName,
    source: feed.source,
    sourceUrl: feed.sourceUrl,
    outputFile: feed.outputFile,
    debugFile: feed.debugFile,
    count: feed.count,
    status: feedStatus(feed),
    error: feed.error || null,
    stateSource: feed.stateSource || null,
    stateUrl: feed.stateUrl || null,
    stateWarning: feed.stateWarning || null,
    retentionDays: feed.retentionDays || null
  }));

  return {
    generatedAt: generatedAt.toISOString(),
    status: normalizedFeeds.some((feed) => feed.status === "error") ? "error" : "ok",
    feedCount: normalizedFeeds.length,
    errorCount: normalizedFeeds.filter((feed) => feed.status === "error").length,
    feeds: normalizedFeeds
  };
}

export function renderIndexHtml(status) {
  const rows = status.feeds
    .map(
      (feed) => `
        <tr>
          <td>${escapeHtml(feed.calendarName)}</td>
          <td>${escapeHtml(feed.source)}</td>
          <td>${feed.count}</td>
          <td><span class="status status-${escapeHtml(feed.status)}">${escapeHtml(feed.status)}</span></td>
          <td>${escapeHtml(feed.stateSource || "")}</td>
          <td>${escapeHtml(feed.error || feed.stateWarning || "")}</td>
          <td><a href="${escapeHtml(feed.outputFile)}">ICS</a></td>
          <td><a href="${escapeHtml(feed.debugFile)}">JSON</a></td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Cerebral Valley Calendar Feeds</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      body {
        margin: 0;
        background: Canvas;
        color: CanvasText;
      }

      main {
        max-width: 1120px;
        margin: 0 auto;
        padding: 32px 20px;
      }

      h1 {
        margin: 0 0 8px;
        font-size: 30px;
        line-height: 1.2;
      }

      p {
        margin: 0 0 24px;
        color: color-mix(in srgb, CanvasText 72%, Canvas);
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
      }

      th,
      td {
        padding: 10px 12px;
        border-bottom: 1px solid color-mix(in srgb, CanvasText 18%, Canvas);
        text-align: left;
        vertical-align: top;
      }

      th {
        font-size: 12px;
        text-transform: uppercase;
        color: color-mix(in srgb, CanvasText 64%, Canvas);
      }

      a {
        color: LinkText;
      }

      .status {
        display: inline-block;
        min-width: 42px;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 12px;
        text-align: center;
      }

      .status-ok {
        background: color-mix(in srgb, green 18%, Canvas);
      }

      .status-error {
        background: color-mix(in srgb, red 18%, Canvas);
      }

      @media (max-width: 760px) {
        main {
          padding: 20px 12px;
        }

        table {
          display: block;
          overflow-x: auto;
          white-space: nowrap;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Cerebral Valley Calendar Feeds</h1>
      <p>Last generated ${escapeHtml(status.generatedAt)}. Machine-readable status is available at <a href="status.json">status.json</a>.</p>
      <table>
        <thead>
          <tr>
            <th>Calendar</th>
            <th>Source</th>
            <th>Events</th>
            <th>Status</th>
            <th>State</th>
            <th>Message</th>
            <th>Subscribe</th>
            <th>Debug</th>
          </tr>
        </thead>
        <tbody>${rows}
        </tbody>
      </table>
    </main>
  </body>
</html>
`;
}

export async function writeStatusFiles({ publicDir, status }) {
  await writeFile(resolve(publicDir, "status.json"), `${JSON.stringify(status, null, 2)}\n`, "utf8");
  await writeFile(resolve(publicDir, "index.html"), renderIndexHtml(status), "utf8");
}
