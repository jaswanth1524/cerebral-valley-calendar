import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const DEFAULT_STATE_BASE_URL = "https://jaswanth1524.github.io/cerebral-valley-calendar";

const USER_AGENT = "jaswanth1524/cerebral-valley-calendar";

function parseStateJson(text, label) {
  const payload = JSON.parse(text);
  if (!Array.isArray(payload.events)) {
    throw new Error(`${label} does not contain an events array`);
  }
  return payload.events;
}

async function loadRemoteEvents(debugFile, baseUrl) {
  const stateUrl = `${baseUrl.replace(/\/$/, "")}/${debugFile}`;
  const response = await fetch(stateUrl, {
    headers: {
      accept: "application/json",
      "user-agent": USER_AGENT
    }
  });

  if (!response.ok) {
    throw new Error(`remote state returned ${response.status}`);
  }

  return {
    events: parseStateJson(await response.text(), stateUrl),
    stateSource: "remote",
    stateUrl,
    stateWarning: null
  };
}

async function loadLocalEvents(debugFile, publicDir) {
  const path = resolve(publicDir, debugFile);
  return {
    events: parseStateJson(await readFile(path, "utf8"), path),
    stateSource: "local",
    stateUrl: path,
    stateWarning: null
  };
}

export async function loadPreviousEventState({
  debugFile,
  publicDir = "public",
  baseUrl = DEFAULT_STATE_BASE_URL
} = {}) {
  const warnings = [];

  if (!debugFile) {
    return {
      events: [],
      stateSource: "empty",
      stateUrl: null,
      stateWarning: "missing debug file"
    };
  }

  if (baseUrl) {
    try {
      return await loadRemoteEvents(debugFile, baseUrl);
    } catch (error) {
      warnings.push(`remote: ${error.message}`);
    }
  }

  try {
    const state = await loadLocalEvents(debugFile, publicDir);
    return {
      ...state,
      stateWarning: warnings.length ? warnings.join("; ") : null
    };
  } catch (error) {
    warnings.push(`local: ${error.message}`);
  }

  return {
    events: [],
    stateSource: "empty",
    stateUrl: null,
    stateWarning: warnings.join("; ")
  };
}
