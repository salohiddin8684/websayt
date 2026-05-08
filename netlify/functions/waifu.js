"use strict";

const https = require("https");

const WAIFU_URL = "https://api.waifu.pics/sfw/waifu";

const DEFAULT_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: { ...DEFAULT_HEADERS, ...extraHeaders },
    body: JSON.stringify(payload),
  };
}

function upstreamError(message, statusCode = 502) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function requestWaifuImage() {
  return new Promise((resolve, reject) => {
    const req = https.request(
      WAIFU_URL,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "AnimeFlixWaifuProxy/1.0",
        },
        timeout: 10000,
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");

        res.on("data", (chunk) => {
          body += chunk;
        });

        res.on("end", () => {
          resolve({
            statusCode: res.statusCode || 500,
            body,
          });
        });
      },
    );

    req.on("timeout", () => {
      req.destroy(upstreamError("Waifu image request timed out.", 504));
    });

    req.on("error", (error) => {
      reject(upstreamError(error.message || "Could not reach waifu.pics.", error?.statusCode || 502));
    });

    req.end();
  });
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: DEFAULT_HEADERS, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method Not Allowed" }, { Allow: "GET, OPTIONS" });
  }

  try {
    const upstream = await requestWaifuImage();
    let payload;

    try {
      payload = upstream.body ? JSON.parse(upstream.body) : {};
    } catch {
      payload = { error: "Invalid JSON response from waifu.pics." };
    }

    if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
      return json(upstream.statusCode, {
        error: "Upstream API error",
        message: payload?.message || payload?.error || `waifu.pics request failed with status ${upstream.statusCode}.`,
        status: upstream.statusCode,
      });
    }

    if (typeof payload?.url !== "string" || !payload.url.trim()) {
      return json(502, {
        error: "Upstream API error",
        message: "waifu.pics response did not include an image url.",
      });
    }

    return json(200, { url: payload.url.trim() });
  } catch (error) {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    return json(statusCode, {
      error: statusCode >= 500 ? "Server error" : "Request error",
      message: error instanceof Error ? error.message : "Unknown server error.",
    });
  }
};
