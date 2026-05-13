/* Profile avatar grid renderer */
(function () {
  "use strict";

  const app = window.AnimeFlix;
  if (!app) return;

  const PROFILE_AVATARS = [
    "akira",
    "asuka",
    "hinata",
    "itachi",
    "kakashi",
    "luffy",
    "makima",
    "mikasa",
    "mob",
    "nami",
    "nezuko",
    "rei",
    "rem",
    "sailor",
    "senku",
    "shinji",
    "tanjiro",
    "vash",
    "yor",
    "yusuke",
    "zero-two",
    "zoro",
    "animeflix-purple",
    "animeflix-blue",
  ].map((seed) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`);

  const DEFAULT_PROFILE_AVATAR =
    "https://api.dicebear.com/7.x/avataaars/svg?seed=animeflix-default&backgroundColor=b6e3f4";

  function renderAvatarOptions(container, { selectedAvatar, onSelect } = {}) {
    if (!container) return;

    const activeAvatar = selectedAvatar || DEFAULT_PROFILE_AVATAR;
    const fragment = document.createDocumentFragment();

    PROFILE_AVATARS.forEach((url, index) => {
      const item = document.createElement("button");
      const isActive = url === activeAvatar;

      item.type = "button";
      item.className = `avatar-item${isActive ? " is-active" : ""}`;
      item.dataset.avatarUrl = url;
      item.setAttribute("role", "radio");
      item.setAttribute("aria-checked", String(isActive));
      item.setAttribute("aria-label", `Avatar ${index + 1}`);

      const img = document.createElement("img");
      img.src = url;
      img.alt = "";
      img.loading = "lazy";
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

  app.PROFILE_AVATARS = PROFILE_AVATARS;
  app.DEFAULT_PROFILE_AVATAR = DEFAULT_PROFILE_AVATAR;
  app.renderAvatarOptions = renderAvatarOptions;
})();
