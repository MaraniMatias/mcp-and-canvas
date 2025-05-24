import nodeFetch from "node-fetch";

/**
 * @param {string} url -
 * @param {nodeFetch.options} options -
 * @param {number} timeout -
 * @returns {Promise<{data:object,res:nodeFetch.res}>}
 */
export async function fetch(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    let body = options.body;
    if (
      !(
        typeof options.body === "string" ||
        options.body instanceof Uint8Array ||
        options.body instanceof ArrayBuffer ||
        options.body instanceof Blob ||
        options.body instanceof ReadableStream
      )
    ) {
      body = JSON.stringify(options.body);
    }

    const res = await nodeFetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      ...options,
      body,
    });
    if (!res.ok) {
      throw new Error(`http ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    return { data, res };
  } finally {
    clearTimeout(id);
  }
}

export default {
  get: (url, body, options = {}) =>
    fetch(url, { method: "GET", ...options, body }),
  post: (url, body, options = {}) =>
    fetch(url, { method: "POST", ...options, body }),
  put: (url, body, options = {}) =>
    fetch(url, { method: "PUT", ...options, body }),
  delete: (url, body, options = {}) =>
    fetch(url, { method: "DELETE", ...options, body }),
};
