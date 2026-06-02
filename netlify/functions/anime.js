"use strict";

const https = require("https");

const JIKAN_BASE_URL = "https://api.jikan.moe/v4";
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 18;
const MAX_LIMIT = 25;

const DEFAULT_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=60, s-maxage=300",
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

function readPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function normalizeBoolean(value) {
  if (value === undefined || value === null || value === "") return null;
  const normalized = String(value).toLowerCase();
  return normalized === "false" || normalized === "0" || normalized === "no" ? "false" : "true";
}

function addParam(url, key, value) {
  if (value === undefined || value === null || value === "") return;
  url.searchParams.set(key, String(value));
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function upstreamError(message, statusCode = 502) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeHeaderValue(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function requestJikan(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "AnimeFlixNetlifyProxy/1.0",
        },
        timeout: 15000,
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
            headers: res.headers || {},
            body,
          });
        });
      },
    );

    req.on("timeout", () => {
      req.destroy(upstreamError("Jikan request timed out.", 504));
    });

    req.on("error", (error) => {
      reject(upstreamError(error.message || "Could not reach Jikan API.", error?.statusCode || 502));
    });

    req.end();
  });
}

function buildJikanUrl(rawParams = {}) {
  const params = rawParams || {};
  const type = String(params.type || "").toLowerCase();
  const resource = String(params.resource || "").toLowerCase();
  const search = String(params.search || params.q || "").trim();
  const genres = String(params.genres || "").trim();
  const genresExclude = String(params.genres_exclude || "").trim();
  const sfw = normalizeBoolean(params.sfw);
  const page = readPositiveInt(params.page, DEFAULT_PAGE);
  const limit = Math.min(readPositiveInt(params.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const animeBrowseTypes = new Set(["tv", "movie", "ova", "ona", "special", "music"]);
  const hasAnimeFilters = Boolean(
    search ||
      genres ||
      genresExclude ||
      animeBrowseTypes.has(type) ||
      params.status ||
      params.min_score ||
      params.max_score ||
      params.start_date ||
      params.end_date ||
      params.rating ||
      params.producers ||
      params.order_by ||
      params.sort,
  );

  const url = new URL(JIKAN_BASE_URL);

  if (resource === "genres") {
    url.pathname += "/genres/anime";
    url.searchParams.set("filter", "genres");
    return url;
  }

  if (params.id !== undefined && params.id !== null && params.id !== "") {
    const id = readPositiveInt(params.id, NaN);
    if (!Number.isFinite(id)) throw badRequest("Invalid anime id.");

    url.pathname += `/anime/${id}`;
    if (resource === "recommendations") url.pathname += "/recommendations";
    else if (resource === "characters") url.pathname += "/characters";
    else if (resource === "videos") url.pathname += "/videos";
    else if (resource && resource !== "details") throw badRequest("Unsupported resource.");
    return url;
  }

  // Search/list browsing supports the advanced filter page. Top lists keep using
  // /top/anime unless advanced query parameters are present.
  if (hasAnimeFilters) {
    url.pathname += "/anime";
    addParam(url, "q", search);
    addParam(url, "page", page);
    addParam(url, "limit", limit);
    addParam(url, "genres", genres);
    addParam(url, "genres_exclude", genresExclude);
    if (animeBrowseTypes.has(type)) addParam(url, "type", type);
    addParam(url, "status", params.status);
    addParam(url, "min_score", params.min_score);
    addParam(url, "max_score", params.max_score);
    addParam(url, "start_date", params.start_date);
    addParam(url, "end_date", params.end_date);
    addParam(url, "rating", params.rating);
    addParam(url, "producers", params.producers);
    addParam(url, "sfw", sfw);
    addParam(url, "order_by", params.order_by || "members");
    addParam(url, "sort", params.sort || "desc");
    return url;
  }

  url.pathname += "/top/anime";
  addParam(url, "page", page);
  addParam(url, "limit", limit);
  addParam(url, "sfw", sfw);

  const topType = type || "top";

  if (topType === "airing") {
    url.searchParams.set("filter", "airing");
    return url;
  }

  if (topType === "popular") {
    url.searchParams.set("filter", "bypopularity");
    return url;
  }

  if (topType !== "top") {
    throw badRequest("Unsupported type. Use top, airing, or popular.");
  }

  const filter = String(params.filter || "").toLowerCase();
  if (filter) addParam(url, "filter", filter);
  return url;
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: DEFAULT_HEADERS, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method Not Allowed" }, { Allow: "GET, OPTIONS" });
  }

  try {
    const jikanUrl = buildJikanUrl(event.queryStringParameters);
    const upstream = await requestJikan(jikanUrl);
    const rawBody = upstream.body;
    let payload;

    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      payload = { message: rawBody || "Invalid JSON response from Jikan." };
    }

    if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
      const message =
        payload?.message ||
        payload?.error ||
        `Jikan request failed with status ${upstream.statusCode}.`;
      const retryAfter = normalizeHeaderValue(upstream.headers["retry-after"]);

      return json(upstream.statusCode, {
        error: "Upstream API error",
        message,
        status: upstream.statusCode,
      }, retryAfter ? { "Retry-After": retryAfter } : {});
    }

    return json(200, payload);
  } catch (error) {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    return json(statusCode, {
      error: statusCode === 400 ? "Bad Request" : "Server error",
      message: error instanceof Error ? error.message : "Unknown server error.",
    });
  }
};
