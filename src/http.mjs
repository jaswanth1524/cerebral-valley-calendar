const DEFAULT_RETRIES = 2;
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRY_DELAY_MS = 500;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

function isAbortError(error) {
  return error?.name === "AbortError";
}

async function responseErrorMessage(response, errorPrefix) {
  const fallback = `${errorPrefix} returned ${response.status}`;

  try {
    const payload = await response.json();
    return payload.message || payload.detail || fallback;
  } catch {
    return fallback;
  }
}

function timeoutError(errorPrefix, timeoutMs) {
  return new Error(`${errorPrefix} timed out after ${timeoutMs}ms`);
}

export async function fetchJson(
  url,
  {
    headers = {},
    errorPrefix = "Request",
    retries = DEFAULT_RETRIES,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    fetchImpl = globalThis.fetch
  } = {}
) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      const response = await fetchImpl(url, {
        headers,
        signal: controller.signal
      });

      if (!response.ok) {
        const message = await responseErrorMessage(response, errorPrefix);
        const error = new Error(message);
        error.status = response.status;

        if (!isRetryableStatus(response.status) || attempt === retries) {
          throw error;
        }

        lastError = error;
      } else {
        return response.json();
      }
    } catch (error) {
      lastError = isAbortError(error) ? timeoutError(errorPrefix, timeoutMs) : error;

      if (error.status && !isRetryableStatus(error.status)) {
        throw error;
      }

      if (attempt === retries) {
        throw lastError;
      }
    } finally {
      if (timeout) clearTimeout(timeout);
    }

    if (retryDelayMs > 0) {
      await sleep(retryDelayMs);
    }
  }

  throw lastError || new Error(`${errorPrefix} failed`);
}
