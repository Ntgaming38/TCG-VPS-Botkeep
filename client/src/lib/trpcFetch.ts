type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const HTML_RESPONSE_MESSAGE = "API Shop SNKR trả về trang HTML thay vì JSON. Vui lòng thử lại sau giây lát.";

export async function fetchTrpcWithHtmlGuard(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  fetchImpl: FetchLike = globalThis.fetch.bind(globalThis),
): Promise<Response> {
  const requestInit: RequestInit = { ...(init ?? {}), credentials: "include" };
  const getInput = () => typeof Request !== "undefined" && input instanceof Request ? input.clone() : input;
  let response = await fetchImpl(getInput(), requestInit);
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json") || contentType.includes("application/vnd.api+json")) {
    return response;
  }

  const bodyPreview = await response.clone().text();
  const looksLikeHtml = contentType.includes("text/html") || /^\s*<!doctype\s+html/i.test(bodyPreview);
  if (!looksLikeHtml) return response;

  await new Promise((resolve) => globalThis.setTimeout(resolve, 250));
  response = await fetchImpl(getInput(), requestInit);
  const retryContentType = response.headers.get("content-type") ?? "";
  if (retryContentType.includes("application/json") || retryContentType.includes("application/vnd.api+json")) {
    return response;
  }

  return new Response(JSON.stringify({
    error: {
      json: {
        message: HTML_RESPONSE_MESSAGE,
        data: { code: "BAD_GATEWAY", httpStatus: 502 },
      },
    },
  }), {
    status: 502,
    headers: { "content-type": "application/json" },
  });
}
