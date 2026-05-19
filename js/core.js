/* AnimeFlix core (globals, state, utils, DOM refs) */
(function () {
  "use strict";

  const runtimeConfig = window.AnimeFlixConfig || {};

  const API_BASE = runtimeConfig.animeApiBase || "/.netlify/functions/anime";
  const AUTH_API_BASE = String(
    runtimeConfig.authApiBase ||
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000/api"
        : "https://your-render-service.onrender.com/api"),
  ).replace(/\/+$/, "");

  const LS_KEYS = {
    theme: "animeflix:theme:v1",
    favorites: "animeflix:favorites:v2",
    continue: "animeflix:continue:v2",
    profile: "animeflix:profile:v1",
    listCache: "animeflix:listCache:v2",
    searchCache: "animeflix:searchCache:v2",
    authToken: "animeflix:auth:token:v1",
    authUser: "animeflix:auth:user:v1",
  };

  const LIMITS = {
    favorites: 50,
    continueWatching: 18,
  };

  const $ = (id) => document.getElementById(id);

  const els = {
    // global
    statusBar: $("statusBar"),
    toasts: $("toasts"),

    // nav
    navHome: $("navHome"),
    navFilter: $("navFilter"),
    navFavorites: $("navFavorites"),
    loginNavBtn: $("loginNavBtn"),
    signupNavBtn: $("signupNavBtn"),

    // auth header
    authGuestActions: $("authGuestActions"),
    authUserActions: $("authUserActions"),
    profileBtn: $("profileBtn"),
    profileBtnName: $("profileBtnName"),
    userAvatarImg: $("userAvatarImg"),
    profileCircle: $("profileCircle"),
    profileMenu: $("profileMenu"),
    profilePreviewImg: $("profilePreviewImg"),
    avatarGrid: $("avatarGrid"),
    profileUsername: $("profileUsername"),
    profileEmail: $("profileEmail"),
    profileDropdownRank: $("profileDropdownRank"),
    profileDropdownContinueCount: $("profileDropdownContinueCount"),
    profileDropdownFavoritesCount: $("profileDropdownFavoritesCount"),
    profileDropdownHistoryCount: $("profileDropdownHistoryCount"),
    profileLogoutBtn: $("profileLogoutBtn"),
    logoutBtn: $("logoutBtn"),

    // auth views
    viewLogin: $("viewLogin"),
    viewSignup: $("viewSignup"),
    loginForm: $("loginForm"),
    loginIdentifier: $("loginIdentifier"),
    loginPassword: $("loginPassword"),
    loginSubmitBtn: $("loginSubmitBtn"),
    signupForm: $("signupForm"),
    signupFullName: $("signupFullName"),
    signupUsername: $("signupUsername"),
    signupEmail: $("signupEmail"),
    signupPassword: $("signupPassword"),
    signupConfirmPassword: $("signupConfirmPassword"),
    signupSubmitBtn: $("signupSubmitBtn"),

    // theme
    themeToggleBtn: $("themeToggleBtn"),
    themeToggleIcon: document.querySelector("#themeToggleBtn .themeToggle__icon"),
    themeToggleText: document.querySelector("#themeToggleBtn .themeToggle__text"),

    // search
    searchInput: $("searchInput"),
    clearSearchBtn: $("clearSearchBtn"),
    genreSelect: $("genreSelect"),
    genreBtn: $("genreBtn"),
    genreBtnLabel: $("genreBtnLabel"),
    genreMenu: $("genreMenu"),
    genreWrap: document.querySelector(".input--select"),
    searchSection: $("searchSection"),
    searchGrid: $("searchGrid"),
    searchCount: $("searchCount"),
    searchSentinel: $("searchSentinel"),
    searchMoreBtn: $("searchMoreBtn"),

    // views
    viewHome: $("viewHome"),
    viewDetails: $("viewDetails"),
    viewFavorites: $("viewFavorites"),
    viewProfile: $("viewProfile"),
    viewFilter: $("viewFilter"),
    profilePageRoot: $("profilePageRoot"),

    // home / hero
    heroTitle: $("heroTitle"),
    heroBgImage: $("heroBgImage"),
    heroImage: $("heroImage"),
    heroScore: $("heroScore"),
    heroEpisodes: $("heroEpisodes"),
    heroSynopsis: $("heroSynopsis"),
    heroDetailsBtn: $("heroDetailsBtn"),
    heroFavBtn: $("heroFavBtn"),
    heroInner: document.querySelector(".hero__inner"),
    heroStage: document.querySelector(".hero__stage"),
    heroPrevBtn: $("heroPrevBtn"),
    heroNextBtn: $("heroNextBtn"),
    heroDots: $("heroDots"),
    heroPageIndex: $("heroPageIndex"),

    continueSection: $("continueSection"),
    continueSlider: $("continueSlider"),
    clearContinueBtn: $("clearContinueBtn"),

    trendingSlider: $("trendingSlider"),
    trendingMeta: $("trendingMeta"),
    trendingSentinel: $("trendingSentinel"),
    trendingMoreBtn: $("trendingMoreBtn"),

    topSlider: $("topSlider"),
    topMeta: $("topMeta"),
    topSentinel: $("topSentinel"),
    topMoreBtn: $("topMoreBtn"),

    popularSlider: $("popularSlider"),
    popularMeta: $("popularMeta"),
    popularSentinel: $("popularSentinel"),
    popularMoreBtn: $("popularMoreBtn"),

    // details page
    detailsBackBtn: $("detailsBackBtn"),
    detailsImage: $("detailsImage"),
    detailsTitle: $("detailsTitle"),
    detailsScore: $("detailsScore"),
    detailsEpisodes: $("detailsEpisodes"),
    detailsGenres: $("detailsGenres"),
    detailsSynopsis: $("detailsSynopsis"),
    detailsFavBtn: $("detailsFavBtn"),
    detailsMalLink: $("detailsMalLink"),
    detailsWatchBtn: $("detailsWatchBtn"),
    detailsTrailerBtn: $("detailsTrailerBtn"),
    recsMeta: $("recsMeta"),
    recsGrid: $("recsGrid"),
    charsMeta: $("charsMeta"),
    charsList: $("charsList"),

    // favorites page
    favoritesGrid: $("favoritesGrid"),
    favoritesEmptyPage: $("favoritesEmptyPage"),
    clearFavoritesBtn: $("clearFavoritesBtn"),
  };

  const cache = new Map();

  const state = {
    theme: "dark",
    favorites: new Map(),
    continue: [],
    hero: null,
    heroPool: [],
    heroPoolIndex: 0,
    heroTimer: null,
    activeAnime: null,
    genreId: "",
    route: { name: "home", id: null },
    profile: {
      initialized: false,
      username: "",
      avatarUrl: "",
      accentId: "purple",
      bannerId: "violet-night",
      watchHistory: [],
      completedAnime: [],
      unlockedAchievementIds: [],
      lastUnlockedAchievementIds: [],
      avatarVersion: 0,
      themePreference: null,
    },
    auth: {
      token: null,
      user: null,
      loading: false,
      syncing: false,
    },
    lists: {
      trending: { page: 1, hasNext: true, loading: false, filter: "airing" },
      top: { page: 1, hasNext: true, loading: false, filter: "" },
      popular: { page: 1, hasNext: true, loading: false, filter: "bypopularity" },
      search: { q: "", page: 1, hasNext: true, loading: false, total: 0 },
    },
    lastRetry: null,
  };

  const controllers = {
    search: null,
    details: null,
    recs: null,
    chars: null,
  };

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function setStatus(message, kind = "info") {
    if (!els.statusBar) return; // Element removed from HTML
    els.statusBar.textContent = message || "";
    els.statusBar.classList.remove("status--error", "status--ok");
    if (kind === "error") els.statusBar.classList.add("status--error");
    if (kind === "ok") els.statusBar.classList.add("status--ok");
  }

  function setRetry(action) {
    state.lastRetry = typeof action === "function" ? action : null;
  }

  function toast(title, text = "", kind = "ok", ttlMs = 2200) {
    const element = document.createElement("div");
    element.className = `toast toast--${kind}`;
    element.innerHTML = '<div class="toast__title"></div><div class="toast__text"></div>';
    element.querySelector(".toast__title").textContent = title;
    element.querySelector(".toast__text").textContent = text;
    els.toasts.appendChild(element);
    setTimeout(() => element.remove(), ttlMs);
  }

  function debounce(fn, delayMs) {
    let timer = null;
    return (...args) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delayMs);
    };
  }

  function sanitizeText(text) {
    if (!text) return "";
    return String(text).replace(/\s+/g, " ").trim();
  }

  function formatScore(score) {
    if (typeof score !== "number") return "--";
    return score.toFixed(2).replace(/\.00$/, "");
  }

  function scoreClass(score) {
    if (typeof score !== "number") return "";
    if (score >= 8) return "score--good";
    if (score >= 6.5) return "score--mid";
    return "score--bad";
  }

  function getImageUrl(anime) {
    return (
      anime?.images?.webp?.large_image_url ||
      anime?.images?.jpg?.large_image_url ||
      anime?.images?.webp?.image_url ||
      anime?.images?.jpg?.image_url ||
      anime?.image ||
      ""
    );
  }

  function animeToLite(anime) {
    return {
      mal_id: Number(anime?.mal_id || 0),
      title: anime?.title || anime?.title_english || anime?.title_japanese || "Untitled",
      score: typeof anime?.score === "number" ? anime.score : null,
      episodes: typeof anime?.episodes === "number" ? anime.episodes : null,
      synopsis: anime?.synopsis || "",
      image: getImageUrl(anime),
      url: anime?.url || "",
      genres: (anime?.genres || []).map((genre) => ({ mal_id: Number(genre.mal_id || 0), name: genre.name || "" })),
      rating: anime?.rating || "",
      explicitGenres: (anime?.explicit_genres || anime?.explicitGenres || []).map((genre) => ({
        mal_id: Number(genre.mal_id || 0),
        name: genre.name || "",
      })),
      trailerUrl: anime?.trailerUrl || anime?.trailer?.url || "",
    };
  }

  function normalizeLiteAnime(anime) {
    if (!anime) return null;
    const lite = animeToLite(anime);
    if (!lite.mal_id || !lite.title) return null;
    return lite;
  }

  function normalizeAnimeCollection(input, limit = LIMITS.favorites) {
    const source = Array.isArray(input) ? input : input ? [input] : [];
    const map = new Map();

    source.forEach((item) => {
      const lite = normalizeLiteAnime(item);
      if (!lite) return;
      map.set(lite.mal_id, lite);
    });

    return Array.from(map.values()).slice(0, limit);
  }

  function isAdultAnime(lite) {
    if (!lite) return false;
    const rating = String(lite.rating || "").toLowerCase();
    if (rating.startsWith("rx")) return true;

    const names = [...(lite.genres || []), ...(lite.explicitGenres || [])].map((genre) =>
      String(genre?.name || "").toLowerCase(),
    );
    return names.includes("hentai");
  }

  function parseRoute() {
    const pathname = location.pathname.replace(/\/+$/, "");
    const pathnameParts = pathname.split("/").filter(Boolean);
    const rawHash = location.hash || "";
    const hash = rawHash.replace(/^#/, "");
    const parts = hash.split("/").filter(Boolean);

    const hasNonProfileHashRoute =
      rawHash === "#/" ||
      (parts.length > 0 && parts[0] !== "profile");

    if (pathnameParts[0] === "profile" && !hasNonProfileHashRoute) {
      return { name: "profile", section: normalizeProfileSection(pathnameParts[1]) };
    }

    if (parts.length === 0) return { name: "home", id: null };
    if (parts[0] === "filter") return { name: "filter", id: null };
    if (parts[0] === "favorites") return { name: "favorites", id: null };
    if (parts[0] === "profile") return { name: "profile", section: normalizeProfileSection(parts[1]) };
    if (parts[0] === "login") return { name: "login", id: null };
    if (parts[0] === "signup") return { name: "signup", id: null };
    if (parts[0] === "anime" && parts[1]) return { name: "details", id: parts[1] };

    return { name: "home", id: null };
  }

  function normalizeProfileSection(section) {
    const value = String(section || "overview").toLowerCase();
    const allowed = new Set(["overview", "continue", "favorites", "history", "settings"]);
    return allowed.has(value) ? value : "overview";
  }

  function setActiveNav() {
    els.navHome.classList.toggle("is-active", state.route.name === "home" || state.route.name === "details");
    els.navFilter?.classList.toggle("is-active", state.route.name === "filter");
    els.navFavorites.classList.toggle("is-active", state.route.name === "favorites");
  }

  function showView(name) {
    [els.viewHome, els.viewDetails, els.viewFavorites, els.viewProfile, els.viewFilter].forEach((view) => {
      view.hidden = true;
    });

    if (name === "home") els.viewHome.hidden = false;
    if (name === "details") els.viewDetails.hidden = false;
    if (name === "favorites") els.viewFavorites.hidden = false;
    if (name === "profile") els.viewProfile.hidden = false;
    if (name === "filter") els.viewFilter.hidden = false;
  }

  function setSearchMode(active) {
    if (state.route.name !== "home") return;
    els.viewHome.hidden = !!active;
    if (!active) els.searchSection.hidden = true;
  }

  window.AnimeFlix = {
    API_BASE,
    AUTH_API_BASE,
    LS_KEYS,
    LIMITS,
    els,
    cache,
    state,
    controllers,
    sleep,
    setStatus,
    setRetry,
    toast,
    debounce,
    sanitizeText,
    formatScore,
    scoreClass,
    animeToLite,
    normalizeLiteAnime,
    normalizeAnimeCollection,
    isAdultAnime,
    normalizeProfileSection,
    parseRoute,
    setActiveNav,
    showView,
    setSearchMode,
  };
})();
