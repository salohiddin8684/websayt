/* AnimeFlix profile page */
(function () {
  "use strict";

  const app = window.AnimeFlix;
  if (!app) return;

  const { els, state, formatScore, toast } = app;
  const SECTION_IDS = {
    continue: "profileContinueSection",
    favorites: "profileFavoritesSection",
    history: "profileHistorySection",
    settings: "profileSettingsSection",
  };

  const FALLBACK_POSTER =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 600'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23111827'/%3E%3Cstop offset='1' stop-color='%23334155'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='420' height='600' fill='url(%23g)'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23e5e7eb' font-family='Arial' font-size='26' dy='.3em'%3ENo Poster%3C/text%3E%3C/svg%3E";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function animeHref(anime) {
    return anime?.mal_id ? `#/anime/${anime.mal_id}` : "#/";
  }

  function normalizeSection(section) {
    return app.normalizeProfileSection?.(section) || "overview";
  }

  function getAccentId() {
    return state.profile?.accentId || "purple";
  }

  function getBannerId() {
    return state.profile?.bannerId || "violet-night";
  }

  function getAccentValue() {
    const selected = app.PROFILE_ACCENTS?.find((accent) => accent.id === getAccentId());
    return selected?.value || "#8b5cf6";
  }

  function getBannerBackground() {
    const selected = app.PROFILE_BANNERS?.find((banner) => banner.id === getBannerId());
    return selected?.background || app.PROFILE_BANNERS?.[0]?.background || "linear-gradient(135deg, #030712, #111827)";
  }

  function getIdentity() {
    return app.getProfileIdentity?.() || { username: "Profile", email: "Local session" };
  }

  function getJoinDate() {
    const createdAt = state.auth?.user?.createdAt;
    const date = createdAt ? new Date(createdAt) : new Date(2026, 0, 1);
    if (Number.isNaN(date.valueOf())) return "Jan 2026";
    return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  }

  function formatRelativeTime(timestamp) {
    const value = Number(timestamp || 0);
    if (!Number.isFinite(value) || value <= 0) return "Just now";

    const deltaMs = Date.now() - value;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (deltaMs < minute) return "Just now";
    if (deltaMs < hour) return `${Math.floor(deltaMs / minute)}m ago`;
    if (deltaMs < day) return `${Math.floor(deltaMs / hour)}h ago`;
    if (deltaMs < day * 7) return `${Math.floor(deltaMs / day)}d ago`;
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function getLibrary() {
    const favorites = Array.from(state.favorites?.values?.() || []);
    const continueWatching = Array.isArray(state.continue) ? state.continue.slice() : [];
    const history = Array.isArray(state.profile?.watchHistory) ? state.profile.watchHistory.slice() : [];
    const completed = Array.isArray(state.profile?.completedAnime) ? state.profile.completedAnime.slice() : [];
    const heroPool = Array.isArray(state.heroPool) ? state.heroPool.slice(0, 12) : [];
    const merged = new Map();

    [...continueWatching, ...favorites, ...history, ...completed, ...heroPool].forEach((anime) => {
      if (anime?.mal_id) merged.set(anime.mal_id, anime);
    });

    return {
      favorites,
      continueWatching,
      history,
      completed,
      all: Array.from(merged.values()),
    };
  }

  function renderStats() {
    const stats = app.getProfileStats?.() || {
      totalWatching: 0,
      favoritesCount: 0,
      completedCount: 0,
      hoursWatched: 0,
      episodesWatched: 0,
      animeWatched: 0,
    };

    return [
      { label: "Watching", value: stats.totalWatching, hint: "active shows" },
      { label: "Favorites", value: stats.favoritesCount, hint: "saved titles" },
      { label: "Completed", value: stats.completedCount, hint: "finished anime" },
      { label: "Episodes", value: stats.episodesWatched, hint: "watched total" },
      { label: "Hours Watched", value: `${stats.hoursWatched}h`, hint: "estimated time" },
      { label: "Anime Seen", value: stats.animeWatched, hint: "unique titles" },
    ];
  }

  function renderContinueCard(item) {
    const progress = Math.max(1, Math.min(100, Number(item.progress || 0)));
    const currentEpisode = Math.max(1, Number(item.currentEpisode || 1));
    const totalEpisodes = item.episodesTotal || item.episodes || "?";
    const title = item.title || "Untitled";

    return `
      <article class="profileContinueCard">
        <a class="profileContinueCard__poster" href="${animeHref(item)}">
          <img data-fallback-poster="true" src="${escapeHtml(item.image || FALLBACK_POSTER)}" alt="${escapeHtml(title)} poster" loading="lazy" decoding="async" />
        </a>
        <div class="profileContinueCard__body">
          <h3>${escapeHtml(title)}</h3>
          <p>Episode ${escapeHtml(currentEpisode)} of ${escapeHtml(totalEpisodes)}</p>
          <div class="profileProgress" aria-label="${progress}% watched"><span style="width:${progress}%"></span></div>
          <a class="profileMiniButton" href="${animeHref(item)}">Continue</a>
        </div>
      </article>
    `;
  }

  function renderFavoriteCard(item) {
    const title = item.title || "Untitled";
    const scoreLabel = typeof item.score === "number" ? `Score ${formatScore(item.score)}` : "Favorite";
    return `
      <article class="profileFavoriteCard" data-favorite-id="${escapeHtml(item.mal_id)}">
        <a href="${animeHref(item)}">
          <img data-fallback-poster="true" src="${escapeHtml(item.image || FALLBACK_POSTER)}" alt="${escapeHtml(title)} poster" loading="lazy" decoding="async" />
          <div class="profileFavoriteCard__shade"></div>
          <div class="profileFavoriteCard__meta">
            <h3>${escapeHtml(title)}</h3>
            <span>${escapeHtml(scoreLabel)}</span>
          </div>
        </a>
        <button class="profileFavoriteCard__remove" type="button" data-remove-favorite="${escapeHtml(item.mal_id)}" aria-label="Remove ${escapeHtml(title)} from favorites">Remove</button>
      </article>
    `;
  }

  function renderHistoryItem(item) {
    const title = item.title || "Untitled";
    const episodeLabel = item.lastEpisode ? `Episode ${item.lastEpisode}` : "Viewed";
    const progressLabel =
      Number.isFinite(Number(item.progress)) && Number(item.progress) >= 0
        ? ` - ${Math.round(Number(item.progress))}%`
        : "";
    const meta = `${episodeLabel}${progressLabel}`;

    return `
      <a class="profileTimelineItem" href="${animeHref(item)}">
        <img data-fallback-poster="true" src="${escapeHtml(item.image || FALLBACK_POSTER)}" alt="${escapeHtml(title)} poster" loading="lazy" decoding="async" />
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(meta)} | ${escapeHtml(formatRelativeTime(item.timestamp))}</p>
        </div>
      </a>
    `;
  }

  function renderAchievementCard(achievement) {
    const unlockedNow = Array.isArray(state.profile.lastUnlockedAchievementIds)
      ? state.profile.lastUnlockedAchievementIds.includes(achievement.id)
      : false;

    return `
      <article class="profileAchievement${achievement.unlocked ? " is-unlocked" : ""}${unlockedNow ? " is-new" : ""}">
        <span aria-hidden="true"></span>
        <h3>${escapeHtml(achievement.title)}</h3>
        <p>${escapeHtml(achievement.description)}</p>
        <div class="profileAchievement__progress">
          <div class="profileAchievement__bar">
            <i style="width:${escapeHtml(achievement.progress)}%"></i>
          </div>
          <small>${escapeHtml(achievement.current)} / ${escapeHtml(achievement.target)}</small>
        </div>
      </article>
    `;
  }

  function routeNavLink(section, label, currentSection) {
    const href = section === "overview" ? "/profile" : `/profile/${section}`;
    const active = currentSection === section;
    return `<a href="${href}" data-profile-page-route="${section}" class="${active ? "is-active" : ""}" aria-current="${active ? "page" : "false"}">${label}</a>`;
  }

  function renderProfilePage() {
    if (!els.profilePageRoot) return;

    try {
      if (!state.profile?.initialized) {
        els.profilePageRoot.innerHTML = `
          <div class="profileLoading">
            <div class="profileLoading__spinner"></div>
            <p>Loading profile...</p>
          </div>
        `;
        return;
      }

      const identity = getIdentity();
      const library = getLibrary();
      const stats = renderStats();
      const achievements = app.getProfileAchievements?.() || [];
      const currentSection = normalizeSection(state.route.section);

      const continueItems = library.continueWatching.slice(0, 12);
      const favoriteItems = library.favorites.slice(0, 18);
      const historyItems = library.history.slice(0, 24);

      els.profilePageRoot.style.setProperty("--profile-accent", getAccentValue());
      els.profilePageRoot.innerHTML = `
        <div class="profileShell" data-profile-section="${escapeHtml(currentSection)}">
          <section class="profileHero" style="--profile-banner:${getBannerBackground()}">
            <div class="profileHero__media" aria-hidden="true"></div>
            <div class="profileHero__glow" aria-hidden="true"></div>
            <div class="profileHero__inner container">
              <div class="profileHero__avatar">
                <img id="profilePageAvatar" src="${escapeHtml(state.profile.avatarUrl || app.DEFAULT_PROFILE_AVATAR)}" alt="${escapeHtml(identity.username)} avatar" />
              </div>
              <div class="profileHero__copy">
                <p class="profileHero__eyebrow">AnimeFlix identity</p>
                <h1 id="profilePageUsername">${escapeHtml(identity.username)}</h1>
                <div class="profileHero__meta">
                  <span>${escapeHtml(app.getAnimeRank?.() || "Anime Rookie")}</span>
                  <span>Joined ${escapeHtml(getJoinDate())}</span>
                </div>
              </div>
            </div>
          </section>

          <nav class="profileRouteNav container" aria-label="Profile sections">
            ${routeNavLink("overview", "Overview", currentSection)}
            ${routeNavLink("continue", "Continue", currentSection)}
            ${routeNavLink("favorites", "Favorites", currentSection)}
            ${routeNavLink("history", "History", currentSection)}
            ${routeNavLink("settings", "Settings", currentSection)}
          </nav>

          <section class="profileStats container" aria-label="Profile stats">
            ${stats
              .map(
                (stat) => `
              <article class="profileStatCard">
                <span>${escapeHtml(stat.label)}</span>
                <strong>${escapeHtml(stat.value)}</strong>
                <small>${escapeHtml(stat.hint)}</small>
              </article>
            `,
              )
              .join("")}
          </section>

          <section class="profileSection container" id="profileContinueSection">
            <div class="profileSection__head">
              <div>
                <p>Resume</p>
                <h2>Continue Watching</h2>
              </div>
            </div>
            <div class="profileContinueShelf">
              ${
                continueItems.length
                  ? continueItems.map(renderContinueCard).join("")
                  : '<div class="profileEmpty">Start watching anime to build your continue queue.</div>'
              }
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
              ${
                favoriteItems.length
                  ? favoriteItems.map(renderFavoriteCard).join("")
                  : '<div class="profileEmpty">No favorites yet. Tap any heart icon to save anime.</div>'
              }
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
              ${
                historyItems.length
                  ? historyItems.map(renderHistoryItem).join("")
                  : '<div class="profileEmpty">No history available. Open an anime to start tracking.</div>'
              }
            </div>
          </section>

          <section class="profileSection container" id="profileSettingsSection">
            <div class="profileSection__head">
              <div>
                <p>Personalization</p>
                <h2>Profile Settings</h2>
              </div>
            </div>
            <div class="profileCustomize">
              <article class="profileCustomize__panel">
                <label class="profileInputLabel" for="profileUsernameInput">Username</label>
                <input class="profileTextInput" id="profileUsernameInput" value="${escapeHtml(identity.username)}" maxlength="28" />
                <div class="profileCustomize__subhead">Theme color</div>
                <div class="profileSwatches" id="profileAccentSwatches">
                  ${(app.PROFILE_ACCENTS || [])
                    .map(
                      (accent) => `
                    <button class="profileSwatch${accent.id === getAccentId() ? " is-active" : ""}" type="button" data-accent-id="${escapeHtml(accent.id)}" style="--swatch:${escapeHtml(accent.value)}" aria-label="${escapeHtml(accent.name)}"></button>
                  `,
                    )
                    .join("")}
                </div>
                <div class="profileCustomize__subhead">Profile banner</div>
                <div class="profileBannerOptions" id="profileBannerOptions">
                  ${(app.PROFILE_BANNERS || [])
                    .map(
                      (banner) => `
                    <button class="profileBannerOption${banner.id === getBannerId() ? " is-active" : ""}" type="button" data-banner-id="${escapeHtml(banner.id)}" style="--banner-option:${banner.background}">
                      <span>${escapeHtml(banner.name)}</span>
                    </button>
                  `,
                    )
                    .join("")}
                </div>
                <div class="profileCustomize__subhead">Theme</div>
                <div class="profileThemeSwitch" id="profileThemeSwitch">
                  <button type="button" data-theme-choice="dark" class="${state.theme === "dark" ? "is-active" : ""}">Dark</button>
                  <button type="button" data-theme-choice="light" class="${state.theme === "light" ? "is-active" : ""}">Light</button>
                </div>
              </article>
              <article class="profileCustomize__panel">
                <div class="profileCustomize__subhead profileCustomize__subhead--top">Avatar selection</div>
                <div class="profilePageAvatarGrid" id="profilePageAvatarGrid" role="radiogroup" aria-label="Profile avatar selection"></div>
                <div class="profileDangerZone">
                  <button class="profileDangerBtn" id="profileClearHistoryBtn" type="button">Reset history</button>
                  <button class="profileDangerBtn" id="profileClearFavoritesBtn" type="button">Clear favorites</button>
                  <button class="profileDangerBtn" id="profileClearContinueBtn" type="button">Clear continue watching</button>
                </div>
              </article>
            </div>
          </section>

          <section class="profileSection container" id="profileAchievementsSection">
            <div class="profileSection__head">
              <div>
                <p>Badges</p>
                <h2>Achievements</h2>
              </div>
            </div>
            <div class="profileAchievements">
              ${
                achievements.length
                  ? achievements.map(renderAchievementCard).join("")
                  : '<div class="profileEmpty">Achievements will unlock as you watch and favorite anime.</div>'
              }
            </div>
          </section>
        </div>
      `;

      attachProfileEvents();
      attachImageFallbacks();
      applySectionVisibility(currentSection);
      scrollToRequestedSection();

      if (Array.isArray(state.profile.lastUnlockedAchievementIds) && state.profile.lastUnlockedAchievementIds.length) {
        window.setTimeout(() => {
          state.profile.lastUnlockedAchievementIds = [];
        }, 700);
      }
    } catch (error) {
      els.profilePageRoot.innerHTML = `
        <div class="profileError">
          <h2>Profile could not load</h2>
          <p>${escapeHtml(error?.message || "Unknown rendering error.")}</p>
          <button class="btn btn--secondary" id="profileRetryBtn" type="button">Retry</button>
        </div>
      `;

      document.getElementById("profileRetryBtn")?.addEventListener("click", () => renderProfilePage());
    }
  }

  function attachImageFallbacks() {
    els.profilePageRoot?.querySelectorAll("img[data-fallback-poster='true']").forEach((image) => {
      image.addEventListener("error", () => {
        image.src = FALLBACK_POSTER;
      });
    });
  }

  function navigateToProfileSection(section) {
    const normalized = normalizeSection(section);
    const target = normalized === "overview" ? "/profile" : `/profile/${normalized}`;
    history.pushState(null, "", target);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  function attachProfileEvents() {
    const avatarGrid = document.getElementById("profilePageAvatarGrid");
    app.renderAvatarOptions?.(avatarGrid, {
      selectedAvatar: state.profile.avatarUrl,
      size: "large",
      onSelect: (url) => {
        app.setProfileAvatar?.(url);
        toast("Avatar updated", "Your avatar was saved.", "ok", 1400);
      },
    });

    els.profilePageRoot?.querySelectorAll("[data-profile-page-route]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        navigateToProfileSection(link.getAttribute("data-profile-page-route"));
      });
    });

    const usernameInput = document.getElementById("profileUsernameInput");
    const commitUsername = () => {
      const value = String(usernameInput?.value || "");
      app.setProfileUsername?.(value);
    };

    usernameInput?.addEventListener("input", (event) => {
      const value = String(event.target.value || "");
      const title = document.getElementById("profilePageUsername");
      if (title) title.textContent = value.trim() || "Player One";
    });

    usernameInput?.addEventListener("blur", commitUsername);
    usernameInput?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      commitUsername();
      usernameInput.blur();
    });

    document.getElementById("profileAccentSwatches")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-accent-id]");
      if (!button) return;

      app.setProfileAccent?.(button.dataset.accentId);
      els.profilePageRoot.style.setProperty("--profile-accent", getAccentValue());
      document.querySelectorAll(".profileSwatch").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
    });

    document.getElementById("profileBannerOptions")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-banner-id]");
      if (!button) return;

      app.setProfileBanner?.(button.dataset.bannerId);
      const hero = document.querySelector(".profileHero");
      if (hero) hero.style.setProperty("--profile-banner", getBannerBackground());
      document.querySelectorAll(".profileBannerOption").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
    });

    document.getElementById("profileThemeSwitch")?.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-theme-choice]");
      if (!button) return;

      const nextTheme = button.dataset.themeChoice === "light" ? "light" : "dark";
      const prevTheme = state.theme;
      app.applyTheme(nextTheme, { persistGuest: !state.auth.user });

      if (state.auth.user) {
        try {
          await app.saveThemePreference?.(nextTheme);
        } catch (error) {
          app.applyTheme(prevTheme, { persistGuest: false });
          toast("Theme not saved", error?.message || "Could not sync theme.", "error", 2200);
          return;
        }
      }

      document.querySelectorAll("#profileThemeSwitch [data-theme-choice]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      toast("Theme updated", `Switched to ${nextTheme} mode`, "ok", 1300);
    });

    document.getElementById("profileClearHistoryBtn")?.addEventListener("click", () => {
      app.clearWatchHistory?.();
      toast("History cleared", "Watch history was reset.", "warn", 1400);
      renderProfilePage();
    });

    document.getElementById("profileClearFavoritesBtn")?.addEventListener("click", async () => {
      const cleared = await app.clearFavorites?.();
      if (!cleared) {
        toast("Favorites not cleared", "Could not update favorites right now.", "error", 2200);
        return;
      }
      app.renderFavoritesPage?.();
      app.refreshFavButtons?.();
      toast("Favorites cleared", "Favorite list is empty.", "warn", 1400);
      renderProfilePage();
    });

    document.getElementById("profileClearContinueBtn")?.addEventListener("click", async () => {
      await app.clearContinueWatching?.();
      app.renderContinue?.();
      toast("Continue list cleared", "Continue watching was reset.", "warn", 1400);
      renderProfilePage();
    });

    els.profilePageRoot?.addEventListener("click", (event) => {
      const removeBtn = event.target.closest("[data-remove-favorite]");
      if (!removeBtn) return;

      const animeId = Number(removeBtn.getAttribute("data-remove-favorite"));
      if (!Number.isFinite(animeId)) return;
      const lite = state.favorites.get(animeId);
      if (!lite) return;

      app.toggleFavorite?.(lite);
    });
  }

  function scrollToRequestedSection() {
    const section = normalizeSection(state.route.section);
    const targetId = SECTION_IDS[section];
    if (!targetId) return;

    const target = document.getElementById(targetId);
    if (!target) return;

    window.setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function applySectionVisibility(section) {
    const normalized = normalizeSection(section);
    const trackableSections = [
      SECTION_IDS.continue,
      SECTION_IDS.favorites,
      SECTION_IDS.history,
      SECTION_IDS.settings,
      "profileAchievementsSection",
    ];

    if (normalized === "overview") {
      trackableSections.forEach((id) => {
        const element = document.getElementById(id);
        if (element) element.hidden = false;
      });
      return;
    }

    trackableSections.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;
      element.hidden = id !== SECTION_IDS[normalized];
    });
  }

  app.renderProfilePage = renderProfilePage;
  app.refreshProfilePage = () => {
    if (!els.viewProfile || els.viewProfile.hidden) return;
    renderProfilePage();
  };

  app.subscribeProfile?.(() => {
    app.refreshProfilePage?.();
  });
})();
