/* AnimeFlix auth (JWT session, forms, profile UI, remote sync) */
(function () {
  "use strict";

  const {
    AUTH_API_BASE,
    LS_KEYS,
    LIMITS,
    els,
    state,
    toast,
    setStatus,
    normalizeAnimeCollection,
  } = window.AnimeFlix;

  const DEFAULT_AVATAR =
    window.AnimeFlix.DEFAULT_PROFILE_AVATAR ||
    "https://api.dicebear.com/7.x/avataaars/svg?seed=animeflix-default&backgroundColor=b6e3f4";

  function getLocalSession() {
    return window.AnimeFlix.getLocalSession?.() || { active: false, username: "" };
  }

  function getActiveIdentity() {
    return window.AnimeFlix.getProfileIdentity?.() || { username: "Profile", email: "user@example.com" };
  }

  function isAuthenticated() {
    const localSession = getLocalSession();
    return (!!state.auth.token && !!state.auth.user) || !!localSession?.active;
  }

  function normalizeUser(user) {
    if (!user) return null;

    return {
      id: String(user._id || user.id || ""),
      fullName: String(user.fullName || "").trim(),
      username: String(user.username || "").trim(),
      email: String(user.email || "").trim().toLowerCase(),
      favorites: normalizeAnimeCollection(user.favorites, LIMITS.favorites),
      continueWatching: normalizeAnimeCollection(user.continueWatching, LIMITS.continueWatching),
      themePreference: user.themePreference === "light" ? "light" : "dark",
      createdAt: user.createdAt || null,
    };
  }

  function persistUser(user) {
    if (!user) {
      localStorage.removeItem(LS_KEYS.authUser);
      return;
    }
    localStorage.setItem(LS_KEYS.authUser, JSON.stringify(user));
  }

  function setToken(token) {
    state.auth.token = token || null;
    if (token) localStorage.setItem(LS_KEYS.authToken, token);
    else localStorage.removeItem(LS_KEYS.authToken);
  }

  function updateAuthUI() {
    const authed = isAuthenticated();
    const identity = getActiveIdentity();

    els.authGuestActions.hidden = authed;
    els.authUserActions.hidden = !authed;

    if (!authed) {
      closeProfileMenu();
      window.AnimeFlix.updateUserProfileButton?.({
        button: els.profileBtn,
        circle: els.profileCircle,
        image: els.userAvatarImg,
        username: "Profile",
        avatarUrl: DEFAULT_AVATAR,
      });
      els.profileUsername.textContent = "username";
      els.profileEmail.textContent = "user@example.com";
      return;
    }

    const savedAvatar = state.profile.avatarUrl || DEFAULT_AVATAR;
    window.AnimeFlix.updateUserProfileButton?.({
      button: els.profileBtn,
      circle: els.profileCircle,
      image: els.userAvatarImg,
      username: identity.username,
      avatarUrl: savedAvatar,
    });

    els.profileUsername.textContent = identity.username;
    els.profileEmail.textContent = identity.email;
  }

  function openProfileMenu() {
    if (!isAuthenticated()) return;
    const identity = getActiveIdentity();
    window.AnimeFlix.openProfileDropdown?.({
      identity,
      avatarUrl: state.profile.avatarUrl || DEFAULT_AVATAR,
      onSelect: (avatarUrl) => {
        window.AnimeFlix.setProfileAvatar?.(avatarUrl || DEFAULT_AVATAR);
        updateAuthUI();
      },
    });
  }

  function closeProfileMenu() {
    window.AnimeFlix.closeProfileDropdown?.();
  }

  function toggleProfileMenu() {
    if (window.AnimeFlix.isProfileDropdownOpen?.()) closeProfileMenu();
    else openProfileMenu();
  }

  async function apiRequest(path, { method = "GET", body, auth = true, signal } = {}) {
    const headers = { Accept: "application/json" };

    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (auth && state.auth.token) headers.Authorization = `Bearer ${state.auth.token}`;

    let response;

    try {
      response = await fetch(`${AUTH_API_BASE}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      });
    } catch {
      throw new Error("Could not reach the authentication server.");
    }

    let payload = {};

    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    if (!response.ok) {
      throw new Error(payload?.message || "Authentication request failed.");
    }

    return payload;
  }

  function buildGuestSnapshot() {
    return {
      favorites: normalizeAnimeCollection(Array.from(state.favorites.values()), LIMITS.favorites),
      continueWatching: normalizeAnimeCollection(state.continue, LIMITS.continueWatching),
      themePreference: localStorage.getItem(LS_KEYS.theme) ? (state.theme === "light" ? "light" : "dark") : null,
    };
  }

  function hasGuestData(snapshot) {
    if (!snapshot) return false;
    return (
      Array.isArray(snapshot.favorites) && snapshot.favorites.length > 0
    ) || (
      Array.isArray(snapshot.continueWatching) && snapshot.continueWatching.length > 0
    ) || Boolean(snapshot.themePreference);
  }

  function applyAuthenticatedUser(user) {
    const normalized = normalizeUser(user);
    if (!normalized) return null;

    state.auth.user = normalized;
    persistUser(normalized);

    state.favorites = new Map(normalized.favorites.map((anime) => [anime.mal_id, anime]));
    if (!Array.isArray(state.continue) || state.continue.length === 0) {
      const now = Date.now();
      state.continue = normalized.continueWatching.map((anime, index) => ({
        ...anime,
        currentEpisode: 1,
        episodesTotal: anime.episodes || null,
        progress: anime.episodes ? Math.max(1, Math.round((1 / anime.episodes) * 100)) : 4,
        updatedAt: now - index,
      }));
    }

    localStorage.setItem(LS_KEYS.favorites, JSON.stringify(normalized.favorites));
    if (state.continue.length) localStorage.setItem(LS_KEYS.continue, JSON.stringify(state.continue));
    else localStorage.removeItem(LS_KEYS.continue);

    window.AnimeFlix.syncProfileWithAuthIdentity?.();
    window.AnimeFlix.refreshAchievements?.({ persist: true });
    window.AnimeFlix.applyTheme(normalized.themePreference || state.theme, { persistGuest: false });

    updateAuthUI();
    window.AnimeFlix.renderContinue?.();
    window.AnimeFlix.renderFavoritesPage?.();
    window.AnimeFlix.refreshFavButtons?.();

    return normalized;
  }

  function restoreGuestState() {
    state.auth.user = null;
    persistUser(null);
    closeProfileMenu();
    window.AnimeFlix.loadProfileState?.();
    window.AnimeFlix.loadTheme();
    updateAuthUI();
    window.AnimeFlix.renderContinue?.();
    window.AnimeFlix.renderFavoritesPage?.();
    window.AnimeFlix.refreshFavButtons?.();
  }

  function clearSession() {
    setToken(null);
    restoreGuestState();
  }

  async function fetchCurrentUser() {
    const payload = await apiRequest("/auth/me");
    return applyAuthenticatedUser(payload.user);
  }

  async function syncGuestData(snapshot, { syncTheme = false } = {}) {
    if (!state.auth.token) return null;

    const body = {
      favorites: normalizeAnimeCollection(snapshot?.favorites, LIMITS.favorites),
      continueWatching: normalizeAnimeCollection(snapshot?.continueWatching, LIMITS.continueWatching),
    };

    if (syncTheme && snapshot?.themePreference) body.themePreference = snapshot.themePreference;
    if (!hasGuestData(body)) return null;

    state.auth.syncing = true;

    try {
      const payload = await apiRequest("/auth/sync", {
        method: "POST",
        body,
      });
      if (payload?.user) applyAuthenticatedUser(payload.user);
      return payload;
    } finally {
      state.auth.syncing = false;
    }
  }

  async function handleAuthSuccess(payload, guestSnapshot, successTitle, successText, { syncTheme = false } = {}) {
    setToken(payload.token);
    if (payload.user) applyAuthenticatedUser(payload.user);

    try {
      if (!payload.user) await fetchCurrentUser();
      if (hasGuestData(guestSnapshot)) {
        const syncPayload = await syncGuestData(guestSnapshot, { syncTheme });
        if (syncPayload?.user) {
          toast("Synced", "Guest favorites and progress were merged into your account.", "ok", 2800);
        }
      }
    } catch (error) {
      toast("Partial sync", error.message || "Signed in, but guest data could not be merged.", "warn", 3200);
    }

    updateAuthUI();
    window.AnimeFlix.closeAuthGate?.();
    toast(successTitle, successText, "ok");
    location.hash = "#/";
  }

  async function restoreSession() {
    const localSession = window.AnimeFlix.restoreLocalSession?.() || getLocalSession();
    const token = localStorage.getItem(LS_KEYS.authToken);
    if (!token) {
      updateAuthUI();
      return !!localSession?.active;
    }

    state.auth.loading = true;
    setToken(token);

    try {
      const cachedUser = normalizeUser(JSON.parse(localStorage.getItem(LS_KEYS.authUser) || "null"));
      if (cachedUser) applyAuthenticatedUser(cachedUser);
    } catch {
      persistUser(null);
    }

    try {
      await fetchCurrentUser();
      setStatus("");
      window.AnimeFlix.closeAuthGate?.();
      return true;
    } catch {
      clearSession();
      return isAuthenticated();
    } finally {
      state.auth.loading = false;
      updateAuthUI();
    }
  }

  function setButtonBusy(button, busy, idleText, busyText) {
    if (!button) return;
    button.disabled = !!busy;
    button.textContent = busy ? busyText : idleText;
  }

  function activateLocalAuth(username, successTitle, successText) {
    const cleanUsername = String(username || "").trim();
    if (!cleanUsername) return false;

    window.AnimeFlix.activateLocalSession?.({ username: cleanUsername });
    window.AnimeFlix.setProfileUsername?.(cleanUsername);
    updateAuthUI();
    window.AnimeFlix.closeAuthGate?.();
    toast(successTitle, successText, "ok");
    location.hash = "#/";
    return true;
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();

    const identifier = String(els.loginIdentifier.value || "").trim();
    const password = String(els.loginPassword.value || "").trim();

    if (!identifier || !password) {
      toast("Missing fields", "Please enter your email or username and password.", "error", 2600);
      return;
    }

    setButtonBusy(els.loginSubmitBtn, true, "Login", "Logging in...");

    try {
      activateLocalAuth(identifier, "Welcome back", "Your local session is ready.");
      els.loginForm.reset();
    } finally {
      setButtonBusy(els.loginSubmitBtn, false, "Login", "Logging in...");
    }
  }

  async function handleSignupSubmit(event) {
    event.preventDefault();

    const fullName = String(els.signupFullName.value || "").trim();
    const username = String(els.signupUsername.value || "").trim();
    const email = String(els.signupEmail.value || "").trim().toLowerCase();
    const password = String(els.signupPassword.value || "");
    const confirmPassword = String(els.signupConfirmPassword.value || "");

    if (!fullName || !username || !email || !password || !confirmPassword) {
      toast("Missing fields", "Please complete every sign up field.", "error", 2600);
      return;
    }

    if (password !== confirmPassword) {
      toast("Password mismatch", "Password and confirm password must match.", "error", 2600);
      return;
    }

    setButtonBusy(els.signupSubmitBtn, true, "Create Account", "Creating...");

    try {
      activateLocalAuth(username || email || fullName, "Account created", "Your local profile is ready.");
      els.signupForm.reset();
    } finally {
      setButtonBusy(els.signupSubmitBtn, false, "Create Account", "Creating...");
    }
  }

  async function logout() {
    window.AnimeFlix.clearLocalSession?.();
    clearSession();
    location.hash = "#/";
    updateAuthUI();
    window.AnimeFlix.openAuthGate?.({ mode: "login" });
    toast("Logged out", "You are back in guest mode.", "warn");
  }

  async function saveRemoteFavorites(favorites) {
    const payload = await apiRequest("/auth/favorites", {
      method: "PUT",
      body: { favorites },
    });
    if (payload?.user) applyAuthenticatedUser(payload.user);
    return payload;
  }

  async function saveRemoteContinueWatching(continueWatching) {
    const payload = await apiRequest("/auth/continue-watching", {
      method: "PUT",
      body: { continueWatching },
    });
    if (payload?.user) applyAuthenticatedUser(payload.user);
    return payload;
  }

  async function saveThemePreference(themePreference) {
    const payload = await apiRequest("/auth/theme", {
      method: "PUT",
      body: { themePreference },
    });
    if (payload?.user) applyAuthenticatedUser(payload.user);
    return payload;
  }

  window.AnimeFlix.isAuthenticated = isAuthenticated;
  window.AnimeFlix.updateAuthUI = updateAuthUI;
  window.AnimeFlix.openProfileMenu = openProfileMenu;
  window.AnimeFlix.closeProfileMenu = closeProfileMenu;
  window.AnimeFlix.toggleProfileMenu = toggleProfileMenu;
  window.AnimeFlix.restoreSession = restoreSession;
  window.AnimeFlix.handleLoginSubmit = handleLoginSubmit;
  window.AnimeFlix.handleSignupSubmit = handleSignupSubmit;
  window.AnimeFlix.logout = logout;
  window.AnimeFlix.saveRemoteFavorites = saveRemoteFavorites;
  window.AnimeFlix.saveRemoteContinueWatching = saveRemoteContinueWatching;
  window.AnimeFlix.saveThemePreference = saveThemePreference;

  window.AnimeFlix.subscribeProfile?.(() => {
    updateAuthUI();
  });
})();
