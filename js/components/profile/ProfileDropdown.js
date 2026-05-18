/* Compact navbar profile dropdown */
(function () {
  "use strict";

  const app = window.AnimeFlix;
  if (!app) return;

  const { els, state, toast } = app;
  const AVATAR_KEY = "animeflix:userAvatar";

  let activeAvatar = app.DEFAULT_PROFILE_AVATAR;
  let activeIdentity = { username: "username", email: "user@example.com" };
  let selectHandler = null;
  let closeTimer = null;

  function isProfileDropdownOpen() {
    return !!els.profileMenu && !els.profileMenu.hidden;
  }

  function getAnimeRank() {
    const favorites = state.favorites?.size || 0;
    const watching = Array.isArray(state.continue) ? state.continue.length : 0;
    const score = favorites * 2 + watching;

    if (score >= 40) return "Anime Legend";
    if (score >= 24) return "Elite Otaku";
    if (score >= 12) return "Seasoned Watcher";
    if (score >= 4) return "Rising Fan";
    return "Anime Rookie";
  }

  function setPreview(avatarUrl) {
    if (!els.profilePreviewImg) return;

    els.profilePreviewImg.hidden = false;
    els.profilePreviewImg.style.display = "";
    els.profilePreviewImg.src = avatarUrl || app.DEFAULT_PROFILE_AVATAR;
    els.profilePreviewImg.alt = `${activeIdentity.username || "Profile"} avatar`;
    els.profilePreviewImg.onerror = () => {
      els.profilePreviewImg.hidden = true;
      els.profilePreviewImg.style.display = "none";
    };
  }

  function setIdentity(identity) {
    activeIdentity = {
      username: String(identity?.username || "username").trim() || "username",
      email: String(identity?.email || "Local session").trim() || "Local session",
    };

    if (els.profileUsername) els.profileUsername.textContent = activeIdentity.username;
    if (els.profileEmail) els.profileEmail.textContent = activeIdentity.email;
    if (els.profileDropdownRank) els.profileDropdownRank.textContent = getAnimeRank();
  }

  function setCounts() {
    const watching = Array.isArray(state.continue) ? state.continue.length : 0;
    const favorites = state.favorites?.size || 0;
    const history = Math.max(watching, Math.min(12, watching + favorites));

    if (els.profileDropdownContinueCount) els.profileDropdownContinueCount.textContent = String(watching);
    if (els.profileDropdownFavoritesCount) els.profileDropdownFavoritesCount.textContent = String(favorites);
    if (els.profileDropdownHistoryCount) els.profileDropdownHistoryCount.textContent = String(history);
  }

  function renderAvatarGrid() {
    app.renderAvatarOptions?.(els.avatarGrid || document.getElementById("avatarGrid"), {
      selectedAvatar: activeAvatar,
      size: "compact",
      onSelect: (url) => {
        activeAvatar = url;
        setPreview(url);
        selectHandler?.(url);
        renderAvatarGrid();
        app.refreshProfilePage?.();
        toast("Avatar updated", "Profile avatar changed instantly.", "ok", 1600);
      },
    });
  }

  function prepareProfileDropdown({ identity, avatarUrl, onSelect } = {}) {
    activeAvatar = avatarUrl || localStorage.getItem(AVATAR_KEY) || app.DEFAULT_PROFILE_AVATAR;
    selectHandler = typeof onSelect === "function" ? onSelect : null;
    setIdentity(identity);
    setCounts();
    setPreview(activeAvatar);
    renderAvatarGrid();
  }

  function openProfileDropdown(options = {}) {
    if (!els.profileMenu || !els.profileBtn) return;

    window.clearTimeout(closeTimer);
    prepareProfileDropdown(options);
    els.profileMenu.hidden = false;
    els.profileBtn.setAttribute("aria-expanded", "true");

    requestAnimationFrame(() => {
      els.profileMenu.classList.add("is-open");
    });
  }

  function closeProfileDropdown() {
    if (!els.profileMenu || els.profileMenu.hidden) return;

    els.profileMenu.classList.remove("is-open");
    els.profileBtn?.setAttribute("aria-expanded", "false");

    closeTimer = window.setTimeout(() => {
      if (!els.profileMenu.classList.contains("is-open")) {
        els.profileMenu.hidden = true;
      }
    }, 180);
  }

  function toggleProfileDropdown(options = {}) {
    if (isProfileDropdownOpen()) closeProfileDropdown();
    else openProfileDropdown(options);
  }

  els.profileMenu?.addEventListener("click", (event) => {
    const routeLink = event.target.closest("[data-profile-route]");
    if (!routeLink) return;

    event.preventDefault();
    closeProfileDropdown();
    history.pushState(null, "", routeLink.getAttribute("href") || "/profile");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

  app.getAnimeRank = getAnimeRank;
  app.openProfileDropdown = openProfileDropdown;
  app.closeProfileDropdown = closeProfileDropdown;
  app.toggleProfileDropdown = toggleProfileDropdown;
  app.isProfileDropdownOpen = isProfileDropdownOpen;
})();
