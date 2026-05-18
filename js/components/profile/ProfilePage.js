/* Dedicated AnimeFlix profile page */
(function () {
  "use strict";

  const app = window.AnimeFlix;
  if (!app) return;

  const { els, state, formatScore, toast } = app;
  const AVATAR_KEY = "animeflix:userAvatar";
  const ACCENT_KEY = "animeflix:profileAccent";
  const BANNER_KEY = "animeflix:profileBanner";

  function getLocalIdentity() {
    const localUsername = String(localStorage.getItem("username") || "").trim();

    if (state.auth.user) {
      return {
        username: state.auth.user.username || state.auth.user.fullName || "Profile",
        email: state.auth.user.email || "Signed in",
        joinDate: state.auth.user.createdAt ? new Date(state.auth.user.createdAt) : null,
      };
    }

    return {
      username: localUsername || "Player One",
      email: localUsername && localUsername.includes("@") ? localUsername.toLowerCase() : "Local session",
      joinDate: null,
    };
  }

  function getSavedAvatar() {
    return localStorage.getItem(AVATAR_KEY) || app.DEFAULT_PROFILE_AVATAR;
  }

  function getSavedAccent() {
    return localStorage.getItem(ACCENT_KEY) || "purple";
  }

  function getSavedBanner() {
    return localStorage.getItem(BANNER_KEY) || "violet-night";
  }

  function getAccentValue() {
    const selected = app.PROFILE_ACCENTS?.find((accent) => accent.id === getSavedAccent());
    return selected?.value || "#8b5cf6";
  }

  function getBannerBackground() {
    const selected = app.PROFILE_BANNERS?.find((banner) => banner.id === getSavedBanner());
    return selected?.background || app.PROFILE_BANNERS?.[0]?.background || "linear-gradient(135deg, #030712, #111827)";
  }

  function getLibrary() {
    const favorites = Array.from(state.favorites?.values?.() || []);
    const watching = Array.isArray(state.continue) ? state.continue.slice() : [];
    const heroPool = Array.isArray(state.heroPool) ? state.heroPool.slice(0, 12) : [];
    const merged = new Map();

    [...watching, ...favorites, ...heroPool].forEach((anime) => {
      if (anime?.mal_id) merged.set(anime.mal_id, anime);
    });

    return {
      favorites,
      watching,
      all: Array.from(merged.values()),
      heroPool,
    };
  }

  function getJoinDate(identity) {
    const date = identity.joinDate instanceof Date && !Number.isNaN(identity.joinDate.valueOf())
      ? identity.joinDate
      : new Date(2026, 0, 1);

    return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  }

  function getAverageScore(items) {
    const scores = items.map((anime) => anime.score).filter((score) => typeof score === "number");
    if (!scores.length) return "--";
    return formatScore(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  function getStats() {
    const library = getLibrary();
    const completed = Math.max(0, Math.round(library.favorites.length * 0.65));
    const planned = Math.max(3, Math.min(24, 12 + library.heroPool.length - library.watching.length));
    const hours = Math.max(8, library.watching.length * 5 + library.favorites.length * 9);

    return [
      { label: "Watching", value: library.watching.length, hint: "active shows" },
      { label: "Completed", value: completed, hint: "finished arcs" },
      { label: "Favorites", value: library.favorites.length, hint: "saved titles" },
      { label: "Planned", value: planned, hint: "watchlist queue" },
      { label: "Hours Watched", value: `${hours}h`, hint: "estimated time" },
      { label: "Score Average", value: getAverageScore(library.all), hint: "library score" },
    ];
  }

  function getHistoryItems() {
    const library = getLibrary();
    const source = (library.watching.length ? library.watching : library.all).slice(0, 6);
    const labels = ["2 hours ago", "Yesterday", "3 days ago", "Last week", "12 days ago", "This month"];

    return source.map((anime, index) => ({
      anime,
      time: labels[index] || "Recently",
      episode: Math.max(1, Math.min(12, index + 3)),
    }));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function animeImage(anime) {
    return anime?.image || "";
  }

  function animeHref(anime) {
    return anime?.mal_id ? `#/anime/${anime.mal_id}` : "#/";
  }

  function renderContinueCard(anime, index) {
    const progress = Math.min(92, Math.max(28, 38 + index * 11));
    return `
      <article class="profileContinueCard">
        <a class="profileContinueCard__poster" href="${animeHref(anime)}">
          <img src="${escapeHtml(animeImage(anime))}" alt="${escapeHtml(anime?.title || "Anime")} poster" loading="lazy" decoding="async" />
        </a>
        <div class="profileContinueCard__body">
          <h3>${escapeHtml(anime?.title || "Untitled")}</h3>
          <p>Episode ${index + 1} of ${anime?.episodes || "??"}</p>
          <div class="profileProgress" aria-label="${progress}% watched"><span style="width:${progress}%"></span></div>
          <a class="profileMiniButton" href="${animeHref(anime)}">Continue</a>
        </div>
      </article>
    `;
  }

  function renderFavoriteCard(anime) {
    return `
      <article class="profileFavoriteCard">
        <a href="${animeHref(anime)}">
          <img src="${escapeHtml(animeImage(anime))}" alt="${escapeHtml(anime?.title || "Anime")} poster" loading="lazy" decoding="async" />
          <div class="profileFavoriteCard__shade"></div>
          <div class="profileFavoriteCard__meta">
            <h3>${escapeHtml(anime?.title || "Untitled")}</h3>
            <span>${typeof anime?.score === "number" ? `Score ${formatScore(anime.score)}` : "Saved anime"}</span>
          </div>
        </a>
      </article>
    `;
  }

  function renderHistoryItem(item) {
    return `
      <article class="profileTimelineItem">
        <img src="${escapeHtml(animeImage(item.anime))}" alt="" loading="lazy" decoding="async" />
        <div>
          <h3>Watched ${escapeHtml(item.anime?.title || "Anime")} Episode ${item.episode}</h3>
          <p>${escapeHtml(item.time)}</p>
        </div>
      </article>
    `;
  }

  function achievementData() {
    const stats = getStats();
    const favorites = state.favorites?.size || 0;
    const watching = Array.isArray(state.continue) ? state.continue.length : 0;

    return [
      { title: "100 Episodes Watched", text: "Long-form dedication", unlocked: Number.parseInt(stats[4].value, 10) >= 25 },
      { title: "Night Watcher", text: "Late session specialist", unlocked: true },
      { title: "Romance Master", text: "Emotion arc collector", unlocked: favorites >= 4 },
      { title: "Shonen Addict", text: "Power scaling expert", unlocked: watching >= 2 },
    ];
  }

  function renderProfilePage() {
    if (!els.profilePageRoot) return;

    const identity = getLocalIdentity();
    const library = getLibrary();
    const activeAvatar = getSavedAvatar();
    const accentValue = getAccentValue();
    const bannerBackground = getBannerBackground();
    const continueItems = (library.watching.length ? library.watching : library.all).slice(0, 8);
    const favoriteItems = (library.favorites.length ? library.favorites : library.all).slice(0, 10);
    const stats = getStats();
    const historyItems = getHistoryItems();
    const achievements = achievementData();

    els.profilePageRoot.style.setProperty("--profile-accent", accentValue);
    els.profilePageRoot.innerHTML = `
      <div class="profileShell" data-profile-section="${escapeHtml(state.route.section || "overview")}">
        <section class="profileHero" style="--profile-banner:${bannerBackground}">
          <div class="profileHero__media" aria-hidden="true"></div>
          <div class="profileHero__glow" aria-hidden="true"></div>
          <div class="profileHero__inner container">
            <div class="profileHero__avatar">
              <img id="profilePageAvatar" src="${escapeHtml(activeAvatar)}" alt="${escapeHtml(identity.username)} avatar" />
            </div>
            <div class="profileHero__copy">
              <p class="profileHero__eyebrow">AnimeFlix identity</p>
              <h1 id="profilePageUsername">${escapeHtml(identity.username)}</h1>
              <div class="profileHero__meta">
                <span>${escapeHtml(app.getAnimeRank?.() || "Anime Rookie")}</span>
                <span>Joined ${escapeHtml(getJoinDate(identity))}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="profileStats container" aria-label="Profile stats">
          ${stats.map((stat) => `
            <article class="profileStatCard">
              <span>${escapeHtml(stat.label)}</span>
              <strong>${escapeHtml(stat.value)}</strong>
              <small>${escapeHtml(stat.hint)}</small>
            </article>
          `).join("")}
        </section>

        <section class="profileSection container" id="profileContinueSection">
          <div class="profileSection__head">
            <div>
              <p>Resume</p>
              <h2>Continue Watching</h2>
            </div>
          </div>
          <div class="profileContinueShelf">
            ${continueItems.length ? continueItems.map(renderContinueCard).join("") : '<div class="profileEmpty">Open anime details to build your continue queue.</div>'}
          </div>
        </section>

        <section class="profileSection container" id="profileFavoritesSection">
          <div class="profileSection__head">
            <div>
              <p>Showcase</p>
              <h2>Favorites</h2>
            </div>
          </div>
          <div class="profileFavoritesGrid">
            ${favoriteItems.length ? favoriteItems.map(renderFavoriteCard).join("") : '<div class="profileEmpty">Your favorite anime showcase is waiting.</div>'}
          </div>
        </section>

        <section class="profileSection container" id="profileHistorySection">
          <div class="profileSection__head">
            <div>
              <p>Timeline</p>
              <h2>Watch History</h2>
            </div>
          </div>
          <div class="profileTimeline">
            ${historyItems.length ? historyItems.map(renderHistoryItem).join("") : '<div class="profileEmpty">No watch history yet.</div>'}
          </div>
        </section>

        <section class="profileSection container" id="profileSettingsSection">
          <div class="profileSection__head">
            <div>
              <p>Personalization</p>
              <h2>Profile Customization</h2>
            </div>
          </div>
          <div class="profileCustomize">
            <article class="profileCustomize__panel">
              <label class="profileInputLabel" for="profileUsernameInput">Username</label>
              <input class="profileTextInput" id="profileUsernameInput" value="${escapeHtml(identity.username)}" maxlength="28" />
              <div class="profileCustomize__subhead">Theme color</div>
              <div class="profileSwatches" id="profileAccentSwatches">
                ${(app.PROFILE_ACCENTS || []).map((accent) => `
                  <button class="profileSwatch${accent.id === getSavedAccent() ? " is-active" : ""}" type="button" data-accent-id="${escapeHtml(accent.id)}" style="--swatch:${escapeHtml(accent.value)}" aria-label="${escapeHtml(accent.name)}"></button>
                `).join("")}
              </div>
              <div class="profileCustomize__subhead">Anime banner</div>
              <div class="profileBannerOptions" id="profileBannerOptions">
                ${(app.PROFILE_BANNERS || []).map((banner) => `
                  <button class="profileBannerOption${banner.id === getSavedBanner() ? " is-active" : ""}" type="button" data-banner-id="${escapeHtml(banner.id)}" style="--banner-option:${banner.background}">
                    <span>${escapeHtml(banner.name)}</span>
                  </button>
                `).join("")}
              </div>
            </article>
            <article class="profileCustomize__panel">
              <div class="profileCustomize__subhead profileCustomize__subhead--top">Avatar selection</div>
              <div class="profilePageAvatarGrid" id="profilePageAvatarGrid" role="radiogroup" aria-label="Profile avatar selection"></div>
            </article>
          </div>
        </section>

        <section class="profileSection container">
          <div class="profileSection__head">
            <div>
              <p>Badges</p>
              <h2>Achievements</h2>
            </div>
          </div>
          <div class="profileAchievements">
            ${achievements.map((badge) => `
              <article class="profileAchievement${badge.unlocked ? " is-unlocked" : ""}">
                <span></span>
                <h3>${escapeHtml(badge.title)}</h3>
                <p>${escapeHtml(badge.text)}</p>
              </article>
            `).join("")}
          </div>
        </section>
      </div>
    `;

    attachProfilePageEvents();
    scrollToRequestedSection();
  }

  function setAvatarEverywhere(avatarUrl) {
    localStorage.setItem(AVATAR_KEY, avatarUrl);
    app.updateAuthUI?.();

    const pageAvatar = document.getElementById("profilePageAvatar");
    if (pageAvatar) pageAvatar.src = avatarUrl;

    const grid = document.getElementById("profilePageAvatarGrid");
    app.renderAvatarOptions?.(grid, {
      selectedAvatar: avatarUrl,
      size: "large",
      onSelect: setAvatarEverywhere,
    });

    toast("Avatar updated", "Your anime identity changed instantly.", "ok", 1600);
  }

  function attachProfilePageEvents() {
    const avatarGrid = document.getElementById("profilePageAvatarGrid");
    app.renderAvatarOptions?.(avatarGrid, {
      selectedAvatar: getSavedAvatar(),
      size: "large",
      onSelect: setAvatarEverywhere,
    });

    document.getElementById("profileUsernameInput")?.addEventListener("input", (event) => {
      const nextUsername = String(event.target.value || "").trim() || "Player One";
      localStorage.setItem("username", nextUsername);
      if (state.auth.localSession) state.auth.localSession.username = nextUsername;

      const title = document.getElementById("profilePageUsername");
      if (title) title.textContent = nextUsername;
      app.updateAuthUI?.();
    });

    document.getElementById("profileAccentSwatches")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-accent-id]");
      if (!button) return;

      const accentId = button.dataset.accentId;
      localStorage.setItem(ACCENT_KEY, accentId);
      els.profilePageRoot.style.setProperty("--profile-accent", getAccentValue());
      document.querySelectorAll(".profileSwatch").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
    });

    document.getElementById("profileBannerOptions")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-banner-id]");
      if (!button) return;

      localStorage.setItem(BANNER_KEY, button.dataset.bannerId);
      const hero = document.querySelector(".profileHero");
      if (hero) hero.style.setProperty("--profile-banner", getBannerBackground());
      document.querySelectorAll(".profileBannerOption").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
    });
  }

  function scrollToRequestedSection() {
    const section = state.route.section || "overview";
    const map = {
      continue: "profileContinueSection",
      favorites: "profileFavoritesSection",
      history: "profileHistorySection",
      settings: "profileSettingsSection",
    };

    const target = map[section] ? document.getElementById(map[section]) : null;
    if (!target) return;

    window.setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  app.renderProfilePage = renderProfilePage;
  app.refreshProfilePage = () => {
    if (!els.viewProfile || els.viewProfile.hidden) return;
    renderProfilePage();
  };
})();
