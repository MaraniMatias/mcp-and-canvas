/**
 * @param {any|Erro} payload - Payload to send in the response
 * @param {200|400|404|500} status - HTTP status code
 * @param {
 * @returns {Response}
 */
export function sendResp(payload, status = 200, headers = {}) {
  let body = payload;

  let _status = status;
  if (payload instanceof Error) {
    _status = status ?? 500;
    body = payload.message;
  }

  if (
    !(
      typeof payload === "string" ||
      payload instanceof Uint8Array ||
      payload instanceof ArrayBuffer ||
      payload instanceof Blob ||
      payload instanceof ReadableStream
    )
  ) {
    body = JSON.stringify(payload);
  }

  return new Response(body, {
    status: _status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

/**
 * @param {TextEncoder} encoder
 * @returns {({type: string, payload: any})=>string}
 */
export function defineEncodedData(encoder) {
  return (type, payload) => {
    const encodedPayload = JSON.stringify({
      timestamp: new Date().toISOString(),
      type: type,
      payload: payload,
    });
    return encoder.encode(`data: ${encodedPayload}\n\n`);
  };
}

export async function parseBody(req) {
  try {
    const body = await req.json();
    return { body, err: null };
  } catch (err) {
    return { body: null, err };
  }
}

/**
 * @param {Record<string, string>} styleObj
 * @returns {{base: Record<string, string>, pseudos: Record<string, string>, keyframes: Record<string, string>}}
 */
export function extractStyles(styleObj) {
  const base = {};
  const pseudos = {};
  const keyframes = {};

  Object.entries(styleObj).forEach(([prop, value]) => {
    if (prop.startsWith("@keyframes")) {
      // ej. "@keyframes rotate"
      keyframes[prop] = value;
    } else if (prop.startsWith("&") || prop.includes(":")) {
      // ej. "&:hover" o "#element_1:hover"
      pseudos[prop] = value;
    } else {
      base[prop] = value;
    }
  });

  return { base, pseudos, keyframes };
}
