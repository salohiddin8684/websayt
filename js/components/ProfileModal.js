/* Profile modal controller */
(function () {
  "use strict";

  const app = window.AnimeFlix;
  if (!app) return;

  const { els, toast } = app;
  const AVATAR_KEY = "animeflix:userAvatar";

  let pendingAvatar = app.DEFAULT_PROFILE_AVATAR;
  let currentAvatar = app.DEFAULT_PROFILE_AVATAR;
  let currentIdentity = { username: "username", email: "user@example.com" };
  let saveHandler = null;
  let closeTimer = null;

  function getInitial(username) {
    return String(username || "User").trim().charAt(0).toUpperCase() || "U";
  }

  function isProfileModalOpen() {
    return !!els.profileMenu && !els.profileMenu.hidden;
  }

  function setBodyLock(locked) {
    document.body.classList.toggle("profile-modal-open", !!locked);
  }

  function setPreview(avatarUrl) {
    const username = currentIdentity.username || "User";

    if (els.profilePreviewInitial) {
      els.profilePreviewInitial.textContent = getInitial(username);
    }

    if (!els.profilePreviewImg) return;

    els.profilePreviewImg.hidden = false;
    els.profilePreviewImg.style.display = "";
    els.profilePreviewImg.src = avatarUrl || app.DEFAULT_PROFILE_AVATAR;
    els.profilePreviewImg.alt = `${username} avatar preview`;
    els.profilePreviewImg.onerror = () => {
      els.profilePreviewImg.hidden = true;
      els.profilePreviewImg.style.display = "none";
    };
  }

  function setSelectionStatus() {
    if (!els.profileSelectionStatus) return;
    els.profileSelectionStatus.textContent = pendingAvatar === currentAvatar ? "Current" : "Unsaved";
    els.profileSelectionStatus.classList.toggle("is-dirty", pendingAvatar !== currentAvatar);
  }

  function renderAvatarGrid() {
    app.renderAvatarOptions?.(els.avatarGrid || document.getElementById("avatarGrid"), {
      selectedAvatar: pendingAvatar,
      onSelect: (url) => {
        pendingAvatar = url;
        setPreview(url);
        setSelectionStatus();
        renderAvatarGrid();
      },
    });
  }

  function setIdentity(identity) {
    currentIdentity = {
      username: String(identity?.username || "username").trim() || "username",
      email: String(identity?.email || "user@example.com").trim() || "user@example.com",
    };

    if (els.profileUsername) els.profileUsername.textContent = currentIdentity.username;
    if (els.profileEmail) els.profileEmail.textContent = currentIdentity.email;
    if (els.profilePreviewInitial) els.profilePreviewInitial.textContent = getInitial(currentIdentity.username);
  }

  function setSaveBusy(isBusy) {
    if (!els.profileSaveBtn) return;
    els.profileSaveBtn.disabled = !!isBusy;
    els.profileSaveBtn.textContent = isBusy ? "Saving..." : "Save avatar";
  }

  function prepareProfileModal({ identity, avatarUrl, onSave } = {}) {
    currentAvatar = avatarUrl || localStorage.getItem(AVATAR_KEY) || app.DEFAULT_PROFILE_AVATAR;
    pendingAvatar = currentAvatar;
    saveHandler = typeof onSave === "function" ? onSave : null;

    setIdentity(identity);
    setPreview(pendingAvatar);
    setSelectionStatus();
    renderAvatarGrid();
    setSaveBusy(false);
  }

  function openProfileModal(options = {}) {
    if (!els.profileMenu || !els.profileBtn) return;

    prepareProfileModal(options);
    window.clearTimeout(closeTimer);
    els.profileMenu.hidden = false;
    setBodyLock(true);
    els.profileBtn.setAttribute("aria-expanded", "true");

    requestAnimationFrame(() => {
      els.profileMenu.classList.add("is-open");
      els.profileSaveBtn?.focus({ preventScroll: true });
    });
  }

  function closeProfileModal() {
    if (!els.profileMenu || els.profileMenu.hidden) return;

    els.profileMenu.classList.remove("is-open");
    els.profileBtn?.setAttribute("aria-expanded", "false");
    setBodyLock(false);

    closeTimer = window.setTimeout(() => {
      if (!els.profileMenu.classList.contains("is-open")) {
        els.profileMenu.hidden = true;
      }
    }, 220);
  }

  function toggleProfileModal(options = {}) {
    if (isProfileModalOpen()) closeProfileModal();
    else openProfileModal(options);
  }

  async function saveProfileAvatar() {
    if (!pendingAvatar || pendingAvatar === currentAvatar) {
      closeProfileModal();
      return;
    }

    setSaveBusy(true);

    try {
      if (saveHandler) {
        await saveHandler(pendingAvatar);
      } else {
        localStorage.setItem(AVATAR_KEY, pendingAvatar);
      }

      currentAvatar = pendingAvatar;
      setSelectionStatus();
      toast("Avatar saved", "Your profile avatar has been updated.", "ok");
      closeProfileModal();
    } catch (error) {
      toast("Avatar error", error?.message || "Could not save avatar.", "error", 2800);
    } finally {
      setSaveBusy(false);
    }
  }

  function attachProfileModalEvents() {
    els.profileBackdrop?.addEventListener("click", closeProfileModal);
    els.profileCloseBtn?.addEventListener("click", closeProfileModal);
    els.profileCancelBtn?.addEventListener("click", closeProfileModal);
    els.profileSaveBtn?.addEventListener("click", saveProfileAvatar);

    els.profileMenu?.addEventListener("click", (event) => {
      if (event.target === els.profileMenu) closeProfileModal();
    });
  }

  attachProfileModalEvents();

  app.openProfileModal = openProfileModal;
  app.closeProfileModal = closeProfileModal;
  app.toggleProfileModal = toggleProfileModal;
  app.isProfileModalOpen = isProfileModalOpen;
})();
