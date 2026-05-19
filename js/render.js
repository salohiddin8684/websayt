/* AnimeFlix rendering (cards, lists, details helpers) */
(function () {
  "use strict";

  const {
    els,
    state,
    sanitizeText,
    formatScore,
    scoreClass,
    toast,
    isAdultAnime,
  } = window.AnimeFlix;

  const HERO_ROTATION_MS = 6500;
  let heroAnimationTimer = null;
  const CARD_FALLBACK_POSTER =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 600'%3E%3Crect width='420' height='600' fill='%23111827'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23e5e7eb' font-family='Arial' font-size='26' dy='.3em'%3ENo Poster%3C/text%3E%3C/svg%3E";

  function isFav(id) {
    return state.favorites.has(Number(id));
  }

  function toggleFavorite(lite) {
    if (!lite?.mal_id) return;

    const id = Number(lite.mal_id);
    const previousFavorites = new Map(state.favorites);

    if (state.favorites.has(id)) {
      state.favorites.delete(id);
      toast("Removed", "Removed from favorites", "warn");
    } else {
      state.favorites.set(id, lite);
      toast("Saved", "Added to favorites", "ok");
    }

    window.AnimeFlix.saveFavorites(previousFavorites);
    pulseFavoriteButtons(id);
    refreshFavButtons();
    renderFavoritesPage();
    window.AnimeFlix.refreshProfilePage?.();
  }

  function pulseFavoriteButtons(id) {
    document.querySelectorAll(`[data-fav-btn][data-id="${id}"]`).forEach((button) => {
      button.classList.remove("is-pop");
      // restart animation when toggled repeatedly
      void button.offsetWidth;
      button.classList.add("is-pop");
      window.setTimeout(() => {
        button.classList.remove("is-pop");
      }, 280);
    });
  }

  function createSkeletonCard() {
    const card = document.createElement("article");
    card.className = "card is-skeleton skeleton";
    card.innerHTML = `
      <div class="card__media skeleton"></div>
      <div class="card__body">
        <div class="sk-line skeleton sm"></div>
        <div class="sk-line skeleton xs"></div>
      </div>
    `;
    return card;
  }

  function createAnimeCard(lite, { inSlider = false } = {}) {
    const card = document.createElement("article");
    card.className = "card";
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `${lite.title} details`);
    card.dataset.id = String(lite.mal_id);

    const favoriteButton = document.createElement("button");
    favoriteButton.type = "button";
    favoriteButton.className = "card__fav";
    favoriteButton.setAttribute("data-fav-btn", "true");
    favoriteButton.setAttribute("data-id", String(lite.mal_id));
    favoriteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleFavorite(lite);
    });

    const media = document.createElement("div");
    media.className = "card__media";

    const image = document.createElement("img");
    image.loading = "lazy";
    image.decoding = "async";
    image.alt = `${lite.title} poster`;
    image.src = lite.image || "";
    image.onerror = () => {
      image.src = CARD_FALLBACK_POSTER;
    };
    media.appendChild(image);

    const body = document.createElement("div");
    body.className = "card__body";

    const title = document.createElement("h3");
    title.className = "card__title";
    title.textContent = lite.title;

    const meta = document.createElement("div");
    meta.className = "card__meta";

    const score = document.createElement("div");
    score.className = `card__score ${scoreClass(lite.score)}`;
    score.textContent = `★ ${formatScore(lite.score)}`;

    const episodes = document.createElement("div");
    episodes.className = "muted";
    episodes.textContent = lite.episodes ? `${lite.episodes} ep` : "--";

    meta.append(score, episodes);
    body.append(title, meta);
    card.append(favoriteButton, media, body);

    const openDetails = () => {
      location.hash = `#/anime/${lite.mal_id}`;
    };

    card.addEventListener("click", openDetails);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openDetails();
      }
    });

    if (inSlider) card.style.scrollSnapAlign = "start";
    return card;
  }

  function renderAnime(container, list, { mode = "append", layout = "slider", skeletonCount = 0 } = {}) {
    if (mode === "replace") container.replaceChildren();

    if (skeletonCount > 0) {
      const fragment = document.createDocumentFragment();
      for (let index = 0; index < skeletonCount; index += 1) {
        fragment.appendChild(createSkeletonCard());
      }
      container.appendChild(fragment);
      return;
    }

    const fragment = document.createDocumentFragment();
    const inSlider = layout === "slider";

    list
      .filter((anime) => !isAdultAnime(anime))
      .forEach((lite) => fragment.appendChild(createAnimeCard(lite, { inSlider })));

    container.appendChild(fragment);
    refreshFavButtons();
  }

  function refreshFavButtons() {
    document.querySelectorAll("[data-fav-btn]").forEach((button) => {
      const id = Number(button.getAttribute("data-id"));
      const active = isFav(id);
      button.classList.toggle("is-on", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.title = active ? "Remove from favorites" : "Add to favorites";
      button.textContent = active ? "♥" : "♡";
    });

    if (state.hero?.mal_id) {
      const active = isFav(state.hero.mal_id);
      els.heroFavBtn.textContent = active ? "Remove favorite" : "Add to favorites";
      els.heroFavBtn.classList.toggle("btn--secondary", !active);
      els.heroFavBtn.classList.toggle("btn--ghost", active);
    }

    if (state.activeAnime?.mal_id) {
      const active = isFav(state.activeAnime.mal_id);
      els.detailsFavBtn.textContent = active ? "Remove favorite" : "Add to favorites";
      els.detailsFavBtn.classList.toggle("btn--secondary", !active);
      els.detailsFavBtn.classList.toggle("btn--ghost", active);
    }
  }

  function renderContinue() {
    if (!Array.isArray(state.continue) || state.continue.length === 0) {
      els.continueSection.hidden = true;
      els.continueSlider.replaceChildren();
      window.AnimeFlix.refreshProfilePage?.();
      return;
    }

    els.continueSection.hidden = false;
    els.continueSlider.replaceChildren();
    renderAnime(els.continueSlider, state.continue, { layout: "slider" });
    window.AnimeFlix.refreshProfilePage?.();
  }

  function renderFavoritesPage() {
    const list = Array.from(state.favorites.values()).slice().reverse();
    els.favoritesGrid.replaceChildren();

    if (list.length === 0) {
      els.favoritesEmptyPage.hidden = false;
      return;
    }

    els.favoritesEmptyPage.hidden = true;
    renderAnime(els.favoritesGrid, list, { layout: "grid" });
  }

  function stopHeroRotation() {
    if (!state.heroTimer) return;
    clearInterval(state.heroTimer);
    state.heroTimer = null;
  }

  function formatHeroNumber(value) {
    return String(value).padStart(2, "0");
  }

  function updateHeroPager() {
    const total = state.heroPool.length;
    const activeIndex = total ? state.heroPoolIndex : -1;

    if (els.heroPageIndex) {
      els.heroPageIndex.textContent = total
        ? `${formatHeroNumber(activeIndex + 1)} / ${formatHeroNumber(total)}`
        : "00 / 00";
    }

    [els.heroPrevBtn, els.heroNextBtn].forEach((button) => {
      if (!button) return;
      button.disabled = total <= 1;
    });

    if (!els.heroDots) return;

    if (Number(els.heroDots.dataset.count || 0) !== total) {
      const fragment = document.createDocumentFragment();

      state.heroPool.forEach((anime, index) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "heroPager__dot";
        dot.dataset.heroPage = String(index);
        dot.setAttribute("aria-label", `Show ${anime.title || "featured anime"}`);
        fragment.appendChild(dot);
      });

      els.heroDots.replaceChildren(fragment);
      els.heroDots.dataset.count = String(total);
    }

    els.heroDots.querySelectorAll("[data-hero-page]").forEach((dot) => {
      const active = Number(dot.dataset.heroPage) === activeIndex;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-current", active ? "true" : "false");
    });
  }

  function renderHero(lite) {
    if (!lite?.mal_id) return;
    state.hero = lite;
    els.heroTitle.textContent = lite.title;
    [els.heroImage, els.heroBgImage].forEach((image) => {
      if (!image) return;
      if (lite.image) image.src = lite.image;
      else image.removeAttribute("src");
    });
    els.heroScore.textContent = `\u2605 ${formatScore(lite.score)}`;
    els.heroEpisodes.textContent = `Episodes: ${lite.episodes ?? "--"}`;
    els.heroSynopsis.textContent = sanitizeText(lite.synopsis) || "No synopsis available.";
    updateHeroPager();
    refreshFavButtons();
  }

  function animateHeroTo(lite) {
    const host = els.heroInner;
    if (!host) {
      renderHero(lite);
      return;
    }

    window.clearTimeout(heroAnimationTimer);
    host.classList.add("hero--switching");
    requestAnimationFrame(() => {
      heroAnimationTimer = window.setTimeout(() => {
        renderHero(lite);
        host.classList.remove("hero--switching");
      }, 420);
    });
  }

  function showHeroAt(index, { animate = true, restartTimer = false } = {}) {
    const total = state.heroPool.length;
    if (!total) {
      updateHeroPager();
      return;
    }

    state.heroPoolIndex = ((Number(index) % total) + total) % total;
    updateHeroPager();

    const nextHeroItem = state.heroPool[state.heroPoolIndex];
    if (animate) animateHeroTo(nextHeroItem);
    else renderHero(nextHeroItem);

    if (restartTimer) startHeroTimer();
  }

  function startHeroTimer() {
    stopHeroRotation();
    if (state.heroPool.length <= 1) return;

    state.heroTimer = setInterval(() => {
      if (state.route.name !== "home") return;
      if (els.viewHome.hidden) return;
      showHeroAt(state.heroPoolIndex + 1);
    }, HERO_ROTATION_MS);
  }

  function startHeroRotation(pool) {
    stopHeroRotation();
    state.heroPool = (pool || []).filter((anime) => anime?.mal_id);

    if (state.heroPool.length === 0) {
      updateHeroPager();
      return;
    }

    const currentIndex = state.hero?.mal_id
      ? state.heroPool.findIndex((anime) => anime.mal_id === state.hero.mal_id)
      : -1;

    state.heroPoolIndex = currentIndex >= 0 ? currentIndex : Math.floor(Math.random() * state.heroPool.length);
    showHeroAt(state.heroPoolIndex);
    startHeroTimer();
  }

  function nextHero() {
    showHeroAt(state.heroPoolIndex + 1, { restartTimer: true });
  }

  function previousHero() {
    showHeroAt(state.heroPoolIndex - 1, { restartTimer: true });
  }

  window.AnimeFlix.renderAnime = renderAnime;
  window.AnimeFlix.refreshFavButtons = refreshFavButtons;
  window.AnimeFlix.renderContinue = renderContinue;
  window.AnimeFlix.renderFavoritesPage = renderFavoritesPage;
  window.AnimeFlix.toggleFavorite = toggleFavorite;
  window.AnimeFlix.startHeroRotation = startHeroRotation;
  window.AnimeFlix.stopHeroRotation = stopHeroRotation;
  window.AnimeFlix.showHeroAt = showHeroAt;
  window.AnimeFlix.nextHero = nextHero;
  window.AnimeFlix.previousHero = previousHero;
})();
