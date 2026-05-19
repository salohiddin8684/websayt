/* AnimeFlix storage + profile state (theme, favorites, continue, profile, caches) */
(function () {
  "use strict";

  const {
    LS_KEYS,
    LIMITS,
    state,
    els,
    toast,
    normalizeLiteAnime,
    normalizeAnimeCollection,
  } = window.AnimeFlix;

  const LEGACY_AVATAR_KEY = "animeflix:userAvatar";
  const PROFILE_LIMITS = {
    history: 120,
    completed: 120,
  };

  const profileSubscribers = new Set();
  let profileBootstrapped = false;
  let cachedStats = { key: "", value: null };
  let cachedAchievements = { key: "", value: [] };

  function safeJsonParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function clamp(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
  }

  function sanitizeUsername(input) {
    return String(input || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 28);
  }

  function getDefaultAvatar() {
    return (
      window.AnimeFlix.DEFAULT_PROFILE_AVATAR ||
      "https://api.dicebear.com/7.x/avataaars/svg?seed=animeflix-default&backgroundColor=b6e3f4"
    );
  }

  function getActiveIdentityFromSession() {
    const authUser = state.auth?.user;
    if (authUser) {
      return {
        username: String(authUser.username || authUser.fullName || "Profile").trim(),
        email: String(authUser.email || "Signed in").trim(),
      };
    }

    const localSession = window.AnimeFlix.getLocalSession?.() || { active: false, username: "" };
    if (localSession?.active) {
      const username = sanitizeUsername(localSession.username || "Player One") || "Player One";
      return {
        username,
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username) ? username.toLowerCase() : "Local session",
      };
    }

    const localUsername = sanitizeUsername(localStorage.getItem("username") || "");
    if (localUsername) {
      return {
        username: localUsername,
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(localUsername) ? localUsername.toLowerCase() : "Local session",
      };
    }

    return {
      username: "Profile",
      email: "user@example.com",
    };
  }

  function normalizeContinueEntry(input, { fallbackDate = Date.now() } = {}) {
    const lite = normalizeLiteAnime(input?.anime || input);
    if (!lite) return null;

    const totalEpisodesRaw = Number(input?.episodesTotal ?? input?.episodes ?? lite.episodes);
    const totalEpisodes = Number.isFinite(totalEpisodesRaw) && totalEpisodesRaw > 0 ? Math.round(totalEpisodesRaw) : null;

    const currentEpisodeRaw = Number(input?.currentEpisode);
    const fallbackEpisode = 1;
    let currentEpisode = Number.isFinite(currentEpisodeRaw) ? Math.round(currentEpisodeRaw) : fallbackEpisode;
    currentEpisode = Math.max(1, currentEpisode);
    if (totalEpisodes) currentEpisode = Math.min(currentEpisode, totalEpisodes);

    const progressRaw = Number(input?.progress);
    let progress = Number.isFinite(progressRaw)
      ? clamp(Math.round(progressRaw), 0, 100)
      : totalEpisodes
        ? clamp(Math.round((currentEpisode / Math.max(totalEpisodes, 1)) * 100), 1, 100)
        : clamp(currentEpisode * 8, 4, 98);

    if (totalEpisodes && currentEpisode >= totalEpisodes) progress = 100;

    const updatedAtRaw = Number(input?.updatedAt || input?.lastPlayedAt || input?.timestamp);
    const updatedAt = Number.isFinite(updatedAtRaw) ? updatedAtRaw : fallbackDate;

    return {
      ...lite,
      currentEpisode,
      episodesTotal: totalEpisodes,
      progress,
      updatedAt,
    };
  }

  function normalizeContinueCollection(input, limit = LIMITS.continueWatching) {
    const source = Array.isArray(input) ? input : input ? [input] : [];
    const seen = new Set();
    const result = [];

    source.forEach((item) => {
      const normalized = normalizeContinueEntry(item);
      if (!normalized) return;
      if (seen.has(normalized.mal_id)) return;
      seen.add(normalized.mal_id);
      result.push(normalized);
    });

    result.sort((left, right) => Number(right.updatedAt || 0) - Number(left.updatedAt || 0));
    return result.slice(0, limit);
  }

  function normalizeHistoryEntry(input) {
    const lite = normalizeLiteAnime(input?.anime || input);
    if (!lite) return null;

    const timestampRaw = Number(input?.timestamp || input?.updatedAt);
    const timestamp = Number.isFinite(timestampRaw) ? timestampRaw : Date.now();

    const visitsRaw = Number(input?.visits);
    const visits = Number.isFinite(visitsRaw) && visitsRaw > 0 ? Math.round(visitsRaw) : 1;

    const lastEpisodeRaw = Number(input?.lastEpisode || input?.currentEpisode);
    const lastEpisode = Number.isFinite(lastEpisodeRaw) && lastEpisodeRaw > 0 ? Math.round(lastEpisodeRaw) : 1;

    const progressRaw = Number(input?.progress);
    const progress = Number.isFinite(progressRaw) ? clamp(Math.round(progressRaw), 0, 100) : null;

    return {
      ...lite,
      timestamp,
      visits,
      lastEpisode,
      progress,
    };
  }

  function normalizeCompletedEntry(input) {
    const lite = normalizeLiteAnime(input?.anime || input);
    if (!lite) return null;

    const completedAtRaw = Number(input?.completedAt || input?.timestamp || input?.updatedAt);
    const completedAt = Number.isFinite(completedAtRaw) ? completedAtRaw : Date.now();

    const totalEpisodesRaw = Number(input?.episodesTotal ?? input?.episodes ?? lite.episodes);
    const episodesTotal = Number.isFinite(totalEpisodesRaw) && totalEpisodesRaw > 0 ? Math.round(totalEpisodesRaw) : lite.episodes || null;

    return {
      ...lite,
      episodesTotal,
      completedAt,
    };
  }

  function normalizeProfilePayload(input) {
    const payload = input && typeof input === "object" ? input : {};
    const username = sanitizeUsername(payload.username || "");
    const avatarUrl = String(payload.avatarUrl || "").trim() || "";
    const accentId = String(payload.accentId || "purple").trim() || "purple";
    const bannerId = String(payload.bannerId || "violet-night").trim() || "violet-night";
    const unlockedAchievementIds = Array.isArray(payload.unlockedAchievementIds)
      ? payload.unlockedAchievementIds.map((item) => String(item || "").trim()).filter(Boolean)
      : [];

    const watchHistory = (Array.isArray(payload.watchHistory) ? payload.watchHistory : [])
      .map(normalizeHistoryEntry)
      .filter(Boolean)
      .sort((left, right) => right.timestamp - left.timestamp)
      .slice(0, PROFILE_LIMITS.history);

    const completedAnime = (Array.isArray(payload.completedAnime) ? payload.completedAnime : [])
      .map(normalizeCompletedEntry)
      .filter(Boolean)
      .sort((left, right) => right.completedAt - left.completedAt)
      .slice(0, PROFILE_LIMITS.completed);

    return {
      username,
      avatarUrl,
      accentId,
      bannerId,
      watchHistory,
      completedAnime,
      unlockedAchievementIds,
      themePreference: payload.themePreference === "light" || payload.themePreference === "dark" ? payload.themePreference : null,
    };
  }

  function serializeProfilePayload() {
    return {
      username: state.profile.username,
      avatarUrl: state.profile.avatarUrl,
      accentId: state.profile.accentId,
      bannerId: state.profile.bannerId,
      watchHistory: state.profile.watchHistory,
      completedAnime: state.profile.completedAnime,
      unlockedAchievementIds: state.profile.unlockedAchievementIds,
      themePreference: state.profile.themePreference,
    };
  }

  function persistProfileState() {
    try {
      localStorage.setItem(LS_KEYS.profile, JSON.stringify(serializeProfilePayload()));
    } catch {
      // ignore quota errors
    }
  }

  function persistContinueState() {
    if (state.continue.length) {
      localStorage.setItem(LS_KEYS.continue, JSON.stringify(state.continue));
    } else {
      localStorage.removeItem(LS_KEYS.continue);
    }
  }

  function invalidateProfileCaches() {
    cachedStats = { key: "", value: null };
    cachedAchievements = { key: "", value: [] };
  }

  function emitProfileChange(reason = "update") {
    invalidateProfileCaches();
    profileSubscribers.forEach((listener) => {
      try {
        listener({ reason, state });
      } catch {
        // no-op
      }
    });

    window.dispatchEvent(
      new CustomEvent("animeflix:profilechange", {
        detail: { reason },
      }),
    );
  }

  function subscribeProfile(listener, { immediate = false } = {}) {
    if (typeof listener !== "function") return () => {};
    profileSubscribers.add(listener);
    if (immediate) listener({ reason: "init", state });
    return () => profileSubscribers.delete(listener);
  }

  function getProfileIdentity() {
    const identity = getActiveIdentityFromSession();
    const username = sanitizeUsername(state.profile.username || identity.username || "Profile") || "Profile";
    return {
      username,
      email: identity.email,
    };
  }

  function ensureProfileIdentity() {
    const identity = getProfileIdentity();
    if (!state.profile.username) {
      state.profile.username = identity.username;
      localStorage.setItem("username", identity.username);
    }

    if (!state.profile.avatarUrl) {
      state.profile.avatarUrl = localStorage.getItem(LEGACY_AVATAR_KEY) || getDefaultAvatar();
      localStorage.setItem(LEGACY_AVATAR_KEY, state.profile.avatarUrl);
    }
  }

  function loadProfileState() {
    const rawProfile = safeJsonParse(localStorage.getItem(LS_KEYS.profile), {});
    const normalizedProfile = normalizeProfilePayload(rawProfile);

    state.profile = {
      ...state.profile,
      ...normalizedProfile,
      avatarUrl: normalizedProfile.avatarUrl || localStorage.getItem(LEGACY_AVATAR_KEY) || getDefaultAvatar(),
      lastUnlockedAchievementIds: [],
      initialized: true,
    };

    ensureProfileIdentity();
    localStorage.setItem(LEGACY_AVATAR_KEY, state.profile.avatarUrl);

    loadFavorites();

    const rawContinue = safeJsonParse(localStorage.getItem(LS_KEYS.continue), []);
    const continueSource =
      Array.isArray(rawContinue) && rawContinue.length
        ? rawContinue
        : Array.isArray(rawProfile?.continueWatching)
          ? rawProfile.continueWatching
          : [];

    state.continue = normalizeContinueCollection(continueSource, LIMITS.continueWatching);
    persistContinueState();

    refreshAchievements({ persist: false });
    persistProfileState();
    profileBootstrapped = true;
    emitProfileChange("profile:load");
  }

  function syncProfileWithAuthIdentity() {
    if (!state.auth?.user) return;
    const identity = getProfileIdentity();
    if (!identity.username) return;
    state.profile.username = identity.username;
    localStorage.setItem("username", identity.username);
    persistProfileState();
    emitProfileChange("profile:auth-sync");
  }

  function applyTheme(theme, { persistGuest = true } = {}) {
    state.theme = theme === "light" ? "light" : "dark";
    document.body.setAttribute("data-theme", state.theme);

    state.profile.themePreference = state.theme;
    if (persistGuest || state.auth.user) localStorage.setItem(LS_KEYS.theme, state.theme);
    persistProfileState();

    updateThemeToggleUI();
    emitProfileChange("theme:apply");
  }

  function loadTheme() {
    const saved = localStorage.getItem(LS_KEYS.theme);
    const fallback = state.profile?.themePreference || "dark";
    applyTheme(saved === "light" || saved === "dark" ? saved : fallback, { persistGuest: false });
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
    refreshAchievements({ persist: false });
    emitProfileChange("favorites:load");
  }

  async function saveFavorites(previousFavorites = null) {
    const list = normalizeAnimeCollection(Array.from(state.favorites.values()), LIMITS.favorites);
    state.favorites = new Map(list.map((anime) => [anime.mal_id, anime]));

    if (!state.auth.user) {
      localStorage.setItem(LS_KEYS.favorites, JSON.stringify(list));
      refreshAchievements({ persist: true });
      emitProfileChange("favorites:save");
      return true;
    }

    try {
      await window.AnimeFlix.saveRemoteFavorites(list);
      refreshAchievements({ persist: true });
      emitProfileChange("favorites:save");
      return true;
    } catch (error) {
      if (previousFavorites instanceof Map) {
        state.favorites = new Map(previousFavorites);
        window.AnimeFlix.renderFavoritesPage();
        window.AnimeFlix.refreshFavButtons();
      }
      toast("Favorites not saved", error.message || "Could not sync favorites to your account.", "error", 2800);
      refreshAchievements({ persist: false });
      emitProfileChange("favorites:error");
      return false;
    }
  }

  function loadContinue() {
    const raw = safeJsonParse(localStorage.getItem(LS_KEYS.continue), []);
    state.continue = normalizeContinueCollection(raw, LIMITS.continueWatching);
    emitProfileChange("continue:load");
  }

  function isEntryCompleted(entry) {
    return Number(entry?.progress) >= 100;
  }

  function addCompletedAnime(lite, completedAt = Date.now()) {
    const normalized = normalizeCompletedEntry({ ...lite, completedAt });
    if (!normalized) return;

    const without = state.profile.completedAnime.filter((item) => item.mal_id !== normalized.mal_id);
    state.profile.completedAnime = [normalized].concat(without).slice(0, PROFILE_LIMITS.completed);
  }

  function removeFromContinueById(malId) {
    state.continue = state.continue.filter((entry) => entry.mal_id !== Number(malId));
  }

  function upsertHistoryEntry(lite, { progress = null, lastEpisode = null, timestamp = Date.now() } = {}) {
    const normalized = normalizeLiteAnime(lite);
    if (!normalized) return;

    const existing = state.profile.watchHistory.find((item) => item.mal_id === normalized.mal_id);
    const visits = existing ? existing.visits + 1 : 1;

    const entry = normalizeHistoryEntry({
      ...normalized,
      timestamp,
      visits,
      lastEpisode: Number.isFinite(Number(lastEpisode))
        ? Number(lastEpisode)
        : Number(existing?.lastEpisode || 1),
      progress: Number.isFinite(Number(progress)) ? Number(progress) : existing?.progress ?? null,
    });

    const without = state.profile.watchHistory.filter((item) => item.mal_id !== normalized.mal_id);
    state.profile.watchHistory = [entry].concat(without).slice(0, PROFILE_LIMITS.history);
  }

  function buildNextContinueEntry(lite, previousEntry, options = {}) {
    const now = Date.now();
    const totalEpisodesRaw = Number(lite?.episodes);
    const totalEpisodes = Number.isFinite(totalEpisodesRaw) && totalEpisodesRaw > 0 ? Math.round(totalEpisodesRaw) : null;

    const explicitEpisodeRaw = Number(options.episode);
    const hasExplicitEpisode = Number.isFinite(explicitEpisodeRaw) && explicitEpisodeRaw > 0;

    let currentEpisode = hasExplicitEpisode
      ? Math.round(explicitEpisodeRaw)
      : previousEntry?.currentEpisode || 1;

    if (options.incrementEpisode) {
      currentEpisode = previousEntry ? previousEntry.currentEpisode + 1 : 1;
    }

    if (totalEpisodes) currentEpisode = clamp(currentEpisode, 1, totalEpisodes);
    else currentEpisode = Math.max(1, currentEpisode);

    const explicitProgressRaw = Number(options.progress);
    const hasExplicitProgress = Number.isFinite(explicitProgressRaw);

    let progress = hasExplicitProgress
      ? clamp(Math.round(explicitProgressRaw), 0, 100)
      : totalEpisodes
        ? clamp(Math.round((currentEpisode / Math.max(totalEpisodes, 1)) * 100), 1, 100)
        : clamp((previousEntry?.progress || 0) + (options.incrementEpisode ? 12 : 4), 4, 98);

    if (totalEpisodes && currentEpisode >= totalEpisodes) progress = 100;
    if (!totalEpisodes && progress >= 96) progress = 100;

    return {
      ...lite,
      currentEpisode,
      episodesTotal: totalEpisodes,
      progress,
      updatedAt: now,
    };
  }

  function normalizeContinueStateForRemote() {
    return normalizeAnimeCollection(state.continue, LIMITS.continueWatching);
  }

  async function saveContinue(liteOrNull, options = {}) {
    const previousContinue = state.continue.slice();

    if (Array.isArray(liteOrNull)) {
      state.continue = normalizeContinueCollection(liteOrNull, LIMITS.continueWatching);
    } else if (!liteOrNull) {
      state.continue = [];
    } else {
      const lite = normalizeLiteAnime(liteOrNull);
      if (!lite) return false;

      const existing = state.continue.find((entry) => entry.mal_id === lite.mal_id);
      const nextEntry = buildNextContinueEntry(lite, existing, options);

      if (isEntryCompleted(nextEntry)) {
        addCompletedAnime(nextEntry, nextEntry.updatedAt);
        removeFromContinueById(nextEntry.mal_id);
      } else {
        const without = state.continue.filter((entry) => entry.mal_id !== nextEntry.mal_id);
        state.continue = [nextEntry].concat(without).slice(0, LIMITS.continueWatching);
      }
    }

    persistContinueState();
    persistProfileState();
    refreshAchievements({ persist: true });
    window.AnimeFlix.renderContinue();
    emitProfileChange("continue:save");

    if (!state.auth.user) return true;

    try {
      await window.AnimeFlix.saveRemoteContinueWatching(normalizeContinueStateForRemote());
      return true;
    } catch (error) {
      state.continue = previousContinue;
      persistContinueState();
      window.AnimeFlix.renderContinue();
      toast("Progress not saved", error.message || "Could not sync continue watching.", "error", 2800);
      emitProfileChange("continue:error");
      return false;
    }
  }

  async function recordAnimeVisit(lite, options = {}) {
    const normalized = normalizeLiteAnime(lite);
    if (!normalized) return false;

    await saveContinue(normalized, { incrementEpisode: true, ...options });
    const entry = state.continue.find((item) => item.mal_id === normalized.mal_id);
    upsertHistoryEntry(normalized, {
      timestamp: Date.now(),
      progress: entry?.progress ?? 100,
      lastEpisode: entry?.currentEpisode ?? normalized.episodes ?? 1,
    });
    persistProfileState();
    refreshAchievements({ persist: true });
    emitProfileChange("history:track");
    return true;
  }

  function clearWatchHistory() {
    state.profile.watchHistory = [];
    persistProfileState();
    refreshAchievements({ persist: true });
    emitProfileChange("history:clear");
  }

  async function clearFavorites() {
    const previousFavorites = new Map(state.favorites);
    state.favorites.clear();
    const saved = await saveFavorites(previousFavorites);
    if (saved) {
      emitProfileChange("favorites:clear");
    }
    return saved;
  }

  function clearCompletedAnime() {
    state.profile.completedAnime = [];
    persistProfileState();
    refreshAchievements({ persist: true });
    emitProfileChange("completed:clear");
  }

  async function clearContinueWatching() {
    return saveContinue(null);
  }

  function setProfileUsername(username) {
    const nextValue = sanitizeUsername(username) || "Player One";
    if (state.profile.username === nextValue) return;
    state.profile.username = nextValue;
    localStorage.setItem("username", nextValue);
    if (state.auth.localSession?.active) {
      state.auth.localSession.username = nextValue;
    }
    persistProfileState();
    emitProfileChange("profile:username");
  }

  function setProfileAvatar(avatarUrl) {
    const nextAvatar = String(avatarUrl || "").trim() || getDefaultAvatar();
    if (state.profile.avatarUrl === nextAvatar) return;
    state.profile.avatarUrl = nextAvatar;
    state.profile.avatarVersion += 1;
    localStorage.setItem(LEGACY_AVATAR_KEY, nextAvatar);
    persistProfileState();
    emitProfileChange("profile:avatar");
  }

  function setProfileAccent(accentId) {
    const nextAccent = String(accentId || "").trim() || "purple";
    if (state.profile.accentId === nextAccent) return;
    state.profile.accentId = nextAccent;
    persistProfileState();
    emitProfileChange("profile:accent");
  }

  function setProfileBanner(bannerId) {
    const nextBanner = String(bannerId || "").trim() || "violet-night";
    if (state.profile.bannerId === nextBanner) return;
    state.profile.bannerId = nextBanner;
    persistProfileState();
    emitProfileChange("profile:banner");
  }

  function buildStatsCacheKey() {
    return [
      state.favorites.size,
      state.continue.length,
      state.profile.completedAnime.length,
      state.profile.watchHistory.length,
      state.profile.watchHistory[0]?.timestamp || 0,
      state.profile.completedAnime[0]?.completedAt || 0,
    ].join("|");
  }

  function getProfileStats() {
    const key = buildStatsCacheKey();
    if (cachedStats.key === key && cachedStats.value) return cachedStats.value;

    const favoritesCount = state.favorites.size;
    const continueCount = state.continue.length;
    const completedCount = state.profile.completedAnime.length;

    const episodesFromContinue = state.continue.reduce((sum, entry) => sum + Math.max(1, Number(entry.currentEpisode || 1)), 0);
    const episodesFromCompleted = state.profile.completedAnime.reduce(
      (sum, entry) => sum + Math.max(1, Number(entry.episodesTotal || entry.episodes || 1)),
      0,
    );
    const episodesFromHistory = state.profile.watchHistory.reduce(
      (sum, entry) => sum + Math.max(1, Number(entry.lastEpisode || 1)),
      0,
    );
    const episodesWatched = Math.max(episodesFromHistory, episodesFromContinue + episodesFromCompleted);
    const hoursWatched = Math.round((episodesWatched * 24) / 60);

    const uniqueAnime = new Set();
    state.continue.forEach((anime) => uniqueAnime.add(anime.mal_id));
    state.profile.watchHistory.forEach((anime) => uniqueAnime.add(anime.mal_id));
    state.profile.completedAnime.forEach((anime) => uniqueAnime.add(anime.mal_id));

    const totalWatching = continueCount;
    const animeWatched = uniqueAnime.size;

    const result = {
      totalWatching,
      favoritesCount,
      completedCount,
      hoursWatched,
      episodesWatched,
      animeWatched,
    };

    cachedStats = { key, value: result };
    return result;
  }

  function computeRankFromStats(stats) {
    const score = (stats.episodesWatched || 0) + (stats.favoritesCount || 0) * 3 + (stats.completedCount || 0) * 5;
    if (score >= 360) return "Anime Sovereign";
    if (score >= 220) return "Anime Legend";
    if (score >= 140) return "Elite Otaku";
    if (score >= 70) return "Seasoned Watcher";
    if (score >= 30) return "Rising Fan";
    return "Anime Rookie";
  }

  function buildAchievementSeed() {
    const stats = getProfileStats();
    return [
      stats.episodesWatched,
      stats.favoritesCount,
      stats.animeWatched,
      stats.completedCount,
      stats.totalWatching,
      state.profile.unlockedAchievementIds.join(","),
    ].join("|");
  }

  function getProfileAchievements() {
    const key = buildAchievementSeed();
    if (cachedAchievements.key === key && cachedAchievements.value.length) return cachedAchievements.value;

    const stats = getProfileStats();
    const templates = [
      {
        id: "episodes_100",
        title: "Episode Marathon",
        description: "Watch 100 episodes",
        current: stats.episodesWatched,
        target: 100,
      },
      {
        id: "favorites_50",
        title: "Collector",
        description: "Add 50 favorites",
        current: stats.favoritesCount,
        target: 50,
      },
      {
        id: "anime_20",
        title: "Explorer",
        description: "Watch 20 different anime",
        current: stats.animeWatched,
        target: 20,
      },
      {
        id: "completed_10",
        title: "Arc Finisher",
        description: "Complete 10 anime",
        current: stats.completedCount,
        target: 10,
      },
      {
        id: "continue_8",
        title: "Multi-Track Watcher",
        description: "Track 8 shows in continue watching",
        current: stats.totalWatching,
        target: 8,
      },
    ];

    const unlockedSet = new Set(state.profile.unlockedAchievementIds || []);
    const computed = templates.map((achievement) => {
      const unlocked = achievement.current >= achievement.target || unlockedSet.has(achievement.id);
      const progress = clamp(Math.round((achievement.current / achievement.target) * 100), 0, 100);

      return {
        ...achievement,
        unlocked,
        progress,
      };
    });

    cachedAchievements = { key, value: computed };
    return computed;
  }

  function refreshAchievements({ persist = true } = {}) {
    const previousUnlocked = new Set(state.profile.unlockedAchievementIds || []);
    const computed = getProfileAchievements();
    const unlockedIds = computed.filter((achievement) => achievement.unlocked).map((achievement) => achievement.id);
    const unlockedSet = new Set(unlockedIds);

    const justUnlocked = unlockedIds.filter((id) => !previousUnlocked.has(id));
    state.profile.lastUnlockedAchievementIds = justUnlocked;
    state.profile.unlockedAchievementIds = unlockedIds;

    if (persist) persistProfileState();
    if (justUnlocked.length) emitProfileChange("achievements:unlock");
    return computed;
  }

  function getAnimeRank() {
    return computeRankFromStats(getProfileStats());
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

  window.AnimeFlix.loadProfileState = loadProfileState;
  window.AnimeFlix.subscribeProfile = subscribeProfile;
  window.AnimeFlix.getProfileIdentity = getProfileIdentity;
  window.AnimeFlix.syncProfileWithAuthIdentity = syncProfileWithAuthIdentity;
  window.AnimeFlix.setProfileUsername = setProfileUsername;
  window.AnimeFlix.setProfileAvatar = setProfileAvatar;
  window.AnimeFlix.setProfileAccent = setProfileAccent;
  window.AnimeFlix.setProfileBanner = setProfileBanner;
  window.AnimeFlix.getProfileStats = getProfileStats;
  window.AnimeFlix.getProfileAchievements = getProfileAchievements;
  window.AnimeFlix.getAnimeRank = getAnimeRank;
  window.AnimeFlix.recordAnimeVisit = recordAnimeVisit;
  window.AnimeFlix.clearWatchHistory = clearWatchHistory;
  window.AnimeFlix.clearCompletedAnime = clearCompletedAnime;
  window.AnimeFlix.clearContinueWatching = clearContinueWatching;
  window.AnimeFlix.clearFavorites = clearFavorites;
  window.AnimeFlix.refreshAchievements = refreshAchievements;

  window.AnimeFlix.loadFavorites = loadFavorites;
  window.AnimeFlix.saveFavorites = saveFavorites;
  window.AnimeFlix.loadContinue = loadContinue;
  window.AnimeFlix.saveContinue = saveContinue;

  window.AnimeFlix.cacheListPage = cacheListPage;
  window.AnimeFlix.getCachedListPage = getCachedListPage;
  window.AnimeFlix.cacheSearchPage = cacheSearchPage;
  window.AnimeFlix.getCachedSearchPage = getCachedSearchPage;

  // Boot profile store once to make profile state immediately available to later modules.
  if (!profileBootstrapped) {
    loadProfileState();
  }
})();
