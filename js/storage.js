/* AnimeFlix storage (theme, favorites, continue, list/search caches) */
(function () {
  "use strict";

  const { LS_KEYS, LIMITS, state, els, toast, normalizeAnimeCollection } = window.AnimeFlix;

  function safeJsonParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function applyTheme(theme, { persistGuest = true } = {}) {
    state.theme = theme === "light" ? "light" : "dark";
    document.body.setAttribute("data-theme", state.theme);
    if (persistGuest) localStorage.setItem(LS_KEYS.theme, state.theme);
    updateThemeToggleUI();
  }

  function loadTheme() {
    const saved = localStorage.getItem(LS_KEYS.theme);
    applyTheme(saved === "light" ? "light" : "dark", { persistGuest: false });
  }

  function updateThemeToggleUI() {
    const isLight = state.theme === "light";
    
    if (els.themeToggleIcon) {
      els.themeToggleIcon.textContent = isLight ? "☀️" : "🌙";
    }
    if (els.themeToggleText) {
      els.themeToggleText.textContent = isLight ? "Light" : "Dark";
    }
  }

  async function toggleTheme() {
    const previousTheme = state.theme;
    const nextTheme = state.theme === "dark" ? "light" : "dark";

    applyTheme(nextTheme, { persistGuest: !state.auth.user });

    if (!state.auth.user) {
      toast("Theme updated", `Switched to ${state.theme} mode`, "ok");
      return;
    }

    try {
      await window.AnimeFlix.saveThemePreference(nextTheme);
      toast("Theme updated", `Saved ${state.theme} mode to your profile`, "ok");
    } catch (error) {
      applyTheme(previousTheme, { persistGuest: false });
      toast("Theme not saved", error.message || "Could not sync your theme preference.", "error", 2800);
    }
  }

  function loadFavorites() {
    const raw = safeJsonParse(localStorage.getItem(LS_KEYS.favorites), []);
    const list = normalizeAnimeCollection(raw, LIMITS.favorites);
    state.favorites = new Map(list.map((anime) => [anime.mal_id, anime]));
  }

  async function saveFavorites(previousFavorites = null) {
    const list = normalizeAnimeCollection(Array.from(state.favorites.values()), LIMITS.favorites);
    state.favorites = new Map(list.map((anime) => [anime.mal_id, anime]));

    if (!state.auth.user) {
      localStorage.setItem(LS_KEYS.favorites, JSON.stringify(list));
      return true;
    }

    try {
      await window.AnimeFlix.saveRemoteFavorites(list);
      return true;
    } catch (error) {
      if (previousFavorites instanceof Map) {
        state.favorites = new Map(previousFavorites);
        window.AnimeFlix.renderFavoritesPage();
        window.AnimeFlix.refreshFavButtons();
      }
      toast("Favorites not saved", error.message || "Could not sync favorites to your account.", "error", 2800);
      return false;
    }
  }

  function loadContinue() {
    const raw = safeJsonParse(localStorage.getItem(LS_KEYS.continue), []);
    state.continue = normalizeAnimeCollection(raw, LIMITS.continueWatching);
  }

  function buildContinueList(nextItem) {
    if (!nextItem) return [];
    const list = [nextItem].concat(state.continue.filter((anime) => anime.mal_id !== nextItem.mal_id));
    return normalizeAnimeCollection(list, LIMITS.continueWatching);
  }

  async function saveContinue(liteOrNull) {
    const previousContinue = state.continue.slice();

    if (Array.isArray(liteOrNull)) {
      state.continue = normalizeAnimeCollection(liteOrNull, LIMITS.continueWatching);
    } else if (!liteOrNull) {
      state.continue = [];
    } else {
      state.continue = buildContinueList(liteOrNull);
    }

    window.AnimeFlix.renderContinue();

    if (!state.auth.user) {
      if (state.continue.length) localStorage.setItem(LS_KEYS.continue, JSON.stringify(state.continue));
      else localStorage.removeItem(LS_KEYS.continue);
      return true;
    }

    try {
      await window.AnimeFlix.saveRemoteContinueWatching(state.continue);
      return true;
    } catch (error) {
      state.continue = previousContinue;
      window.AnimeFlix.renderContinue();
      toast("Progress not saved", error.message || "Could not sync continue watching.", "error", 2800);
      return false;
    }
  }

  function loadListCache() {
    return safeJsonParse(localStorage.getItem(LS_KEYS.listCache), {});
  }

  function saveListCache(cacheObject) {
    try {
      localStorage.setItem(LS_KEYS.listCache, JSON.stringify(cacheObject));
    } catch {
      // ignore quota errors
    }
  }

  function cacheListPage(listKey, page, items, hasNext) {
    const all = loadListCache();
    const current = all[listKey] || { pages: {}, updatedAt: 0 };
    current.pages[String(page)] = { items, hasNext };
    current.updatedAt = Date.now();
    all[listKey] = current;
    saveListCache(all);
  }

  function getCachedListPage(listKey, page, maxAgeMs = 30 * 60 * 1000) {
    const all = loadListCache();
    const current = all[listKey];
    if (!current?.updatedAt || Date.now() - current.updatedAt > maxAgeMs) return null;
    return current.pages?.[String(page)] || null;
  }

  function loadSearchCache() {
    return safeJsonParse(localStorage.getItem(LS_KEYS.searchCache), {});
  }

  function saveSearchCache(cacheObject) {
    try {
      localStorage.setItem(LS_KEYS.searchCache, JSON.stringify(cacheObject));
    } catch {
      // ignore quota errors
    }
  }

  function cacheSearchPage({ q, genreId, page, items, hasNext, total }) {
    const all = loadSearchCache();
    const key = `${(q || "").trim().toLowerCase()}|${genreId || ""}`;
    const current = all[key] || { pages: {}, updatedAt: 0, total: 0 };
    current.pages[String(page)] = { items, hasNext };
    current.total = typeof total === "number" ? total : current.total;
    current.updatedAt = Date.now();
    all[key] = current;
    saveSearchCache(all);
  }

  function getCachedSearchPage({ q, genreId, page, maxAgeMs = 20 * 60 * 1000 }) {
    const all = loadSearchCache();
    const key = `${(q || "").trim().toLowerCase()}|${genreId || ""}`;
    const current = all[key];
    if (!current?.updatedAt || Date.now() - current.updatedAt > maxAgeMs) return null;
    const cachedPage = current.pages?.[String(page)];
    if (!cachedPage) return null;
    return { ...cachedPage, total: current.total };
  }

  window.AnimeFlix.applyTheme = applyTheme;
  window.AnimeFlix.loadTheme = loadTheme;
  window.AnimeFlix.toggleTheme = toggleTheme;
  window.AnimeFlix.loadFavorites = loadFavorites;
  window.AnimeFlix.saveFavorites = saveFavorites;
  window.AnimeFlix.loadContinue = loadContinue;
  window.AnimeFlix.saveContinue = saveContinue;
  window.AnimeFlix.cacheListPage = cacheListPage;
  window.AnimeFlix.getCachedListPage = getCachedListPage;
  window.AnimeFlix.cacheSearchPage = cacheSearchPage;
  window.AnimeFlix.getCachedSearchPage = getCachedSearchPage;
})();
