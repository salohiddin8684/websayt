/* Reusable profile avatar selector */
(function () {
  "use strict";

  const app = window.AnimeFlix;
  if (!app) return;

  function renderAvatarOptions(container, { selectedAvatar, onSelect, size = "compact" } = {}) {
    if (!container) return;

    const activeAvatar = selectedAvatar || app.DEFAULT_PROFILE_AVATAR;
    const fragment = document.createDocumentFragment();

    (app.PROFILE_AVATARS || []).forEach((url, index) => {
      const item = document.createElement("button");
      const isActive = url === activeAvatar;

      item.type = "button";
      item.className = `avatar-item avatar-item--${size}${isActive ? " is-active" : ""}`;
      item.dataset.avatarUrl = url;
      item.setAttribute("role", "radio");
      item.setAttribute("aria-checked", String(isActive));
      item.setAttribute("aria-label", `Avatar ${index + 1}`);

      const img = document.createElement("img");
      img.src = url;
      img.alt = "";
      img.loading = "eager";
      img.decoding = "async";
      img.onerror = () => {
        img.hidden = true;
        item.classList.add("avatar-error");
      };

      item.appendChild(img);
      item.addEventListener("click", () => onSelect?.(url, index));
      fragment.appendChild(item);
    });

    container.replaceChildren(fragment);
  }

  app.renderAvatarOptions = renderAvatarOptions;
})();
