/* Navbar profile dropdown interactions */
(function () {
  "use strict";

  const app = window.AnimeFlix;
  if (!app) return;

  const { els, state, toast } = app;
  const MENU_CLOSE_DELAY_MS = 180;

  let activeAvatar = app.DEFAULT_PROFILE_AVATAR;
  let activeIdentity = { username: "Profile", email: "user@example.com" };
  let selectHandler = null;
  let closeTimer = null;

  function isProfileDropdownOpen() {
    return !!els.profileMenu && !els.profileMenu.hidden;
  }

  function lockMobileScroll(locked) {
    const compactViewport = window.matchMedia("(max-width: 640px)").matches;
    if (!compactViewport) return;
    document.body.classList.toggle("profile-menu-open", !!locked);
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
      username: String(identity?.username || "Profile").trim() || "Profile",
      email: String(identity?.email || "Local session").trim() || "Local session",
    };

    if (els.profileUsername) els.profileUsername.textContent = activeIdentity.username;
    if (els.profileEmail) els.profileEmail.textContent = activeIdentity.email;
    if (els.profileDropdownRank) els.profileDropdownRank.textContent = app.getAnimeRank?.() || "Anime Rookie";
  }

  function setCounts() {
    const watching = Array.isArray(state.continue) ? state.continue.length : 0;
    const favorites = state.favorites?.size || 0;
    const history = Array.isArray(state.profile?.watchHistory) ? state.profile.watchHistory.length : 0;

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

  function focusFirstMenuControl() {
    const firstControl = els.profileMenu?.querySelector("[data-profile-route], .avatar-item, #profileLogoutBtn");
    firstControl?.focus({ preventScroll: true });
  }

  function prepareProfileDropdown({ identity, avatarUrl, onSelect } = {}) {
    activeAvatar = avatarUrl || state.profile?.avatarUrl || app.DEFAULT_PROFILE_AVATAR;
    selectHandler = typeof onSelect === "function" ? onSelect : (url) => app.setProfileAvatar?.(url);
    setIdentity(identity || app.getProfileIdentity?.());
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
    lockMobileScroll(true);

    requestAnimationFrame(() => {
      els.profileMenu.classList.add("is-open");
      focusFirstMenuControl();
    });
  }

  function closeProfileDropdown({ restoreFocus = false } = {}) {
    if (!els.profileMenu || els.profileMenu.hidden) return;

    els.profileMenu.classList.remove("is-open");
    els.profileBtn?.setAttribute("aria-expanded", "false");
    lockMobileScroll(false);

    closeTimer = window.setTimeout(() => {
      if (!els.profileMenu.classList.contains("is-open")) {
        els.profileMenu.hidden = true;
      }
      if (restoreFocus) els.profileBtn?.focus({ preventScroll: true });
    }, MENU_CLOSE_DELAY_MS);
  }

  function toggleProfileDropdown(options = {}) {
    if (isProfileDropdownOpen()) closeProfileDropdown({ restoreFocus: true });
    else openProfileDropdown(options);
  }

  function navigateProfileRoute(route) {
    const target = String(route || "/profile");
    history.pushState(null, "", target);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  els.profileMenu?.addEventListener("click", (event) => {
    const routeLink = event.target.closest("[data-profile-route]");
    if (!routeLink) return;

    event.preventDefault();
    closeProfileDropdown({ restoreFocus: true });
    navigateProfileRoute(routeLink.getAttribute("href"));
  });

  document.addEventListener("pointerdown", (event) => {
    if (!isProfileDropdownOpen()) return;
    const target = event.target;
    if (target === els.profileBtn || els.profileBtn?.contains(target)) return;
    if (target === els.profileMenu || els.profileMenu?.contains(target)) return;
    closeProfileDropdown();
  });

  document.addEventListener("keydown", (event) => {
    if (!isProfileDropdownOpen()) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeProfileDropdown({ restoreFocus: true });
    }
  });

  els.profileBtn?.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    openProfileDropdown();
  });

  window.addEventListener("resize", () => {
    if (!isProfileDropdownOpen()) return;
    lockMobileScroll(true);
  });

  window.addEventListener("hashchange", () => closeProfileDropdown());
  window.addEventListener("popstate", () => closeProfileDropdown());

  app.subscribeProfile?.(() => {
    if (!isProfileDropdownOpen()) return;
    prepareProfileDropdown({
      identity: app.getProfileIdentity?.(),
      avatarUrl: state.profile?.avatarUrl || activeAvatar,
      onSelect: selectHandler,
    });
  });

  app.openProfileDropdown = openProfileDropdown;
  app.closeProfileDropdown = closeProfileDropdown;
  app.toggleProfileDropdown = toggleProfileDropdown;
  app.isProfileDropdownOpen = isProfileDropdownOpen;
})();
