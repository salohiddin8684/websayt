/* Header profile trigger updater */
(function () {
  "use strict";

  const app = window.AnimeFlix;
  if (!app) return;

  function getInitial(username) {
    return String(username || "User").trim().charAt(0).toUpperCase() || "U";
  }

  function updateUserProfileButton({ button, circle, image, username, avatarUrl }) {
    if (!button || !circle) return;

    const label = String(username || "Profile").trim() || "Profile";
    const nextAvatar = avatarUrl || app.DEFAULT_PROFILE_AVATAR || "";

    circle.dataset.initial = getInitial(label);

    if (image) {
      image.hidden = false;
      image.style.display = "";
      image.src = nextAvatar;
      image.alt = `${label} avatar`;
      image.onerror = () => {
        image.hidden = true;
        image.style.display = "none";
      };
    }

    button.title = label;
    button.setAttribute("aria-label", `Profile: ${label}`);
  }

  app.updateUserProfileButton = updateUserProfileButton;
})();
