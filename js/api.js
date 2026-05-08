/* AnimeFlix API (Netlify proxy client + request pacing) */
(function () {
  "use strict";

  const { API_BASE, cache, sleep } = window.AnimeFlix;

  const requestGate = {
    chain: Promise.resolve(),
    lastAt: 0,
    minGapMs: 1200,
  };

  async function scheduleRequest() {
    const run = async () => {
      const now = Date.now();
      const wait = Math.max(0, requestGate.minGapMs - (now - requestGate.lastAt));
      if (wait) await sleep(wait);
      requestGate.lastAt = Date.now();
    };
    requestGate.chain = requestGate.chain.then(run, run);
    return requestGate.chain;
  }

  function addQueryParam(url, key, value) {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  }

  function buildProxyUrl(path, params = {}) {
    const normalizedPath = String(path || "").trim();
    
    // Live Serverda ishlayotganimizni tekshiramiz
    const isLocal = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
    
    // Agar lokal bo'lsa, Jikan API-ga to'g'ridan-to'g'ri boramiz, aks holda Netlify funksiyasiga
    const base = isLocal ? "https://api.jikan.moe/v4" : window.location.origin;
    const url = isLocal ? new URL(base + normalizedPath) : new URL(API_BASE, base);

    const detailMatch = normalizedPath.match(/^\/anime\/(\d+)(?:\/(recommendations|characters))?$/);

    // Preserve the existing fetchAnime(path, params) contract and translate it
    // into the Netlify function query format.
    if (normalizedPath === "/top/anime") {
      const filter = String(params.filter || "").toLowerCase();
      const type =
        params.type ||
        (filter === "airing" ? "airing" : filter === "bypopularity" ? "popular" : "top");

      if (isLocal) {
        // Jikan API uchun parametrlarni o'zgartiramiz
        if (type === "airing") addQueryParam(url, "filter", "airing");
        else if (type === "popular") addQueryParam(url, "filter", "bypopularity");
        addQueryParam(url, "page", params.page);
        addQueryParam(url, "limit", params.limit);
        addQueryParam(url, "sfw", params.sfw);
        return url;
      }

      addQueryParam(url, "type", type);
      addQueryParam(url, "page", params.page);
      addQueryParam(url, "limit", params.limit);
      addQueryParam(url, "sfw", params.sfw);

      if (filter && filter !== "airing" && filter !== "bypopularity") {
        addQueryParam(url, "filter", filter);
      }

      return url;
    }

    if (normalizedPath === "/anime") {
      if (isLocal) {
        addQueryParam(url, "q", params.search || params.q);
        addQueryParam(url, "page", params.page);
        addQueryParam(url, "limit", params.limit);
        addQueryParam(url, "genres", params.genres);
        addQueryParam(url, "sfw", params.sfw);
        addQueryParam(url, "order_by", params.order_by);
        addQueryParam(url, "sort", params.sort);
        return url;
      }

      addQueryParam(url, "search", params.search || params.q);
      addQueryParam(url, "page", params.page);
      addQueryParam(url, "limit", params.limit);
      addQueryParam(url, "genres", params.genres);
      addQueryParam(url, "sfw", params.sfw);
      addQueryParam(url, "order_by", params.order_by);
      addQueryParam(url, "sort", params.sort);
      return url;
    }

    if (normalizedPath === "/genres/anime") {
      if (isLocal) {
        addQueryParam(url, "filter", "genres");
        return url;
      }
      addQueryParam(url, "resource", "genres");
      return url;
    }

    if (detailMatch) {
      if (isLocal) {
        // Local development - direct Jikan API
        const animeId = detailMatch[1];
        const resource = detailMatch[2];
        
        if (resource === "recommendations") {
          url.pathname = `/anime/${animeId}/recommendations`;
        } else if (resource === "characters") {
          url.pathname = `/anime/${animeId}/characters`;
        } else {
          url.pathname = `/anime/${animeId}`;
        }
        return url;
      } else {
        // Netlify function
        addQueryParam(url, "id", detailMatch[1]);
        addQueryParam(url, "resource", detailMatch[2] || "details");
        return url;
      }
    }

    throw new Error(`Unsupported API path: ${normalizedPath}`);
  }

  async function fetchAnime(path, params = {}, { cacheTtlMs = 45_000, signal } = {}) {
    const url = buildProxyUrl(path, params);

    const key = url.toString();
    const cached = cache.get(key);
    if (cached && Date.now() - cached.t < cacheTtlMs) return cached.json;

    const headers = { Accept: "application/json" };
    const maxAttempts = 3;
    let lastRes = null;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await scheduleRequest();

      try {
        const res = await fetch(key, { headers, signal });
        lastRes = res;
        lastError = null;

        if (res.ok) {
          const json = await res.json();
          cache.set(key, { t: Date.now(), json });
          return json;
        }

        const isRateLimit = res.status === 429;
        const isTransient = res.status === 502 || res.status === 503 || res.status === 504;

        if (signal?.aborted) break;

        if ((isRateLimit || isTransient) && attempt < maxAttempts) {
          let waitMs = 0;
          if (isRateLimit) {
            const retryAfterSec = Number(res.headers.get("Retry-After"));
            waitMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0 ? retryAfterSec * 1000 : 2500;
          } else {
            waitMs = 900 * 2 ** (attempt - 1);
          }
          waitMs += Math.floor(Math.random() * 250);
          await sleep(waitMs);
          continue;
        }

        break;
      } catch (err) {
        if (err?.name === "AbortError") throw err;
        lastError = err;
        if (attempt < maxAttempts) {
          const waitMs = 900 * 2 ** (attempt - 1) + Math.floor(Math.random() * 250);
          await sleep(waitMs);
          continue;
        }
      }
    }

    if (!lastRes || !lastRes.ok) {
      if (!lastRes && lastError) {
        throw new Error("Network error while loading anime data.");
      }

      const status = lastRes?.status ?? 0;
      let msg = `Request failed (${status || "network error"})`;
      try {
        const data = await lastRes.json();
        if (data?.message) msg = data.message;
      } catch {
        // ignore
      }
      if (status === 429) msg = "Too many requests (429). Please wait a few seconds and try again.";
      if (status === 504) msg = "Jikan timed out (504). Server may be overloaded—try again in a moment.";
      throw new Error(msg);
    }
  }

  window.AnimeFlix.scheduleRequest = scheduleRequest;
  window.AnimeFlix.fetchAnime = fetchAnime;
})();
