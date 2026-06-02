/* AnimeFlix app logic (lists, search, details, genres, routing, events, init) */
(function () {
  "use strict";

  const {
    els,
    state,
    controllers,
    setStatus,
    toast,
    debounce,
    sleep,
    sanitizeText,
    formatScore,
    animeToLite,
    isAdultAnime,
    parseRoute,
    setActiveNav,
    showView,
    setSearchMode,
  } = window.AnimeFlix;

  const {
    fetchAnime,
    cacheListPage,
    getCachedListPage,
    cacheSearchPage,
    getCachedSearchPage,
  } = window.AnimeFlix;
  const DETAILS_FALLBACK_POSTER =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 600'%3E%3Crect width='420' height='600' fill='%23111827'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23e5e7eb' font-family='Arial' font-size='26' dy='.3em'%3ENo Poster%3C/text%3E%3C/svg%3E";

  async function loadHero() {
    try {
      setStatus("Loading featured anime...");
      const data = await fetchAnime("/top/anime", { page: 1, limit: 10, sfw: true });
      const list = (data?.data || []).map(animeToLite).filter((anime) => !isAdultAnime(anime));
      const pool = list.filter((anime) => anime.synopsis && anime.image);
      if (!pool.length) throw new Error("No results.");
      window.AnimeFlix.startHeroRotation(pool);
      setStatus("", "ok");
    } catch (error) {
      toast("Hero error", error.message || "Could not load featured anime", "error", 3000);
      els.heroTitle.textContent = "Could not load featured anime";
      els.heroSynopsis.textContent = "Try again in a moment. Rate limits can happen.";
    }
  }

  async function loadList(listKey, container, metaEl, { limit = 18 } = {}) {
    const listState = state.lists[listKey];
    if (!listState || listState.loading || !listState.hasNext) return;

    listState.loading = true;
    metaEl.textContent = `Loading page ${listState.page}...`;

    if (container.children.length === 0) {
      window.AnimeFlix.renderAnime(container, [], { skeletonCount: 8, layout: "slider" });
    }

    try {
      const params = { page: listState.page, limit, sfw: true };
      if (listState.filter) params.filter = listState.filter;

      const data = await fetchAnime("/top/anime", params);
      const items = (data?.data || []).map(animeToLite).filter((anime) => !isAdultAnime(anime));
      const pagination = data?.pagination || {};

      listState.hasNext = !!pagination?.has_next_page;
      metaEl.textContent = `Page ${listState.page}${listState.hasNext ? "" : " • End"}`;

      if (container.querySelector(".is-skeleton")) container.replaceChildren();
      window.AnimeFlix.renderAnime(container, items, { layout: "slider" });

      cacheListPage(listKey, listState.page, items, listState.hasNext);
      listState.page += 1;
    } catch (error) {
      metaEl.textContent = "Error";
      toast(`${listKey} error`, error.message || "Failed to load anime list", "error", 3000);

      const cached = getCachedListPage(listKey, listState.page);
      if (cached?.items?.length) {
        if (container.querySelector(".is-skeleton")) container.replaceChildren();
        window.AnimeFlix.renderAnime(container, cached.items, { layout: "slider" });
        listState.hasNext = !!cached.hasNext;
        metaEl.textContent = `Page ${listState.page} (cached)${listState.hasNext ? "" : " • End"}`;
        listState.page += 1;
        setStatus(`${listKey}: showing cached results`, "ok");
      }
    } finally {
      listState.loading = false;
    }
  }

  async function searchAnime({ reset = false } = {}) {
    const searchState = state.lists.search;
    const query = (searchState.q || "").trim();

    if (!query && !state.genreId) return;
    if (searchState.loading) return;
    if (!searchState.hasNext && !reset) return;

    searchState.loading = true;
    setSearchMode(true);
    els.searchSection.hidden = false;
    setStatus(query ? `Searching "${query}"...` : "Filtering by genre...");

    let aborted = false;

    try {
      if (controllers.search) controllers.search.abort();
      controllers.search = new AbortController();

      if (reset) {
        searchState.page = 1;
        searchState.hasNext = true;
        searchState.total = 0;
        els.searchGrid.replaceChildren();
        window.AnimeFlix.renderAnime(els.searchGrid, [], { skeletonCount: 12, layout: "grid" });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      const params = { page: searchState.page, limit: 18, sfw: "true", order_by: "members", sort: "desc" };
      if (query) params.q = query;
      if (state.genreId) params.genres = state.genreId;

      const data = await fetchAnime("/anime", params, {
        cacheTtlMs: 10_000,
        signal: controllers.search.signal,
      });

      const items = (data?.data || []).map(animeToLite).filter((anime) => !isAdultAnime(anime));
      const pagination = data?.pagination || {};

      searchState.hasNext = !!pagination?.has_next_page;
      searchState.total = pagination?.items?.total ?? searchState.total;
      els.searchCount.textContent = searchState.total ? `${searchState.total} results` : "";

      if (els.searchGrid.querySelector(".is-skeleton")) els.searchGrid.replaceChildren();
      window.AnimeFlix.renderAnime(els.searchGrid, items, { layout: "grid" });

      cacheSearchPage({
        q: query,
        genreId: state.genreId,
        page: searchState.page,
        items,
        hasNext: searchState.hasNext,
        total: searchState.total,
      });

      searchState.page += 1;
      setStatus("");
    } catch (error) {
      if (error?.name === "AbortError") {
        aborted = true;
      } else {
        toast("Search error", error.message || "Request failed", "error", 2600);

        const cached = getCachedSearchPage({ q: query, genreId: state.genreId, page: searchState.page });
        if (cached?.items?.length) {
          if (els.searchGrid.querySelector(".is-skeleton")) els.searchGrid.replaceChildren();
          window.AnimeFlix.renderAnime(els.searchGrid, cached.items, { layout: "grid" });
          searchState.hasNext = !!cached.hasNext;
          searchState.total = typeof cached.total === "number" ? cached.total : searchState.total;
          els.searchCount.textContent = searchState.total ? `${searchState.total} results (cached)` : "Cached results";
          searchState.page += 1;
          setStatus("Search: showing cached results", "ok");
        }
      }
    } finally {
      searchState.loading = false;
      if (aborted) {
        setStatus("");
      }
    }
  }

  function clearSearch() {
    if (controllers.search) controllers.search.abort();

    state.lists.search.q = "";
    state.lists.search.page = 1;
    state.lists.search.hasNext = true;
    state.lists.search.total = 0;
    state.genreId = "";

    els.genreSelect.value = "";
    els.genreBtnLabel.textContent = "All genres";
    els.searchInput.value = "";
    els.searchCount.textContent = "";
    els.searchGrid.replaceChildren();
    els.searchSection.hidden = true;

    setSearchMode(false);
    setStatus("");
  }

  function setDetailsSkeleton() {
    els.detailsTitle.textContent = "Loading...";
    els.detailsScore.textContent = "★ --";
    els.detailsEpisodes.textContent = "Episodes: --";
    els.detailsGenres.replaceChildren();
    els.detailsSynopsis.textContent = "";
    els.detailsImage.removeAttribute("src");
    els.detailsTrailerBtn.hidden = true;
    els.detailsMalLink.href = "#";
    els.detailsWatchBtn.href = "#";
    els.detailsFavBtn.disabled = true;
    els.recsMeta.textContent = "";
    els.recsGrid.replaceChildren();
    els.charsMeta.textContent = "";
    els.charsList.replaceChildren();
  }

  async function loadRecommendations(id) {
    els.recsMeta.textContent = "Loading...";
    els.recsGrid.replaceChildren();

    try {
      if (controllers.recs) controllers.recs.abort();
      controllers.recs = new AbortController();

      const data = await fetchAnime(`/anime/${id}/recommendations`, { sfw: true }, {
        cacheTtlMs: 60_000,
        signal: controllers.recs.signal,
      });

      const list = (data?.data || [])
        .map((entry) => entry?.entry)
        .filter(Boolean)
        .slice(0, 10)
        .map(animeToLite)
        .filter((anime) => !isAdultAnime(anime));

      if (!list.length) {
        els.recsMeta.textContent = "No recommendations";
        return;
      }

      els.recsMeta.textContent = `${list.length} items`;
      window.AnimeFlix.renderAnime(els.recsGrid, list, { layout: "grid" });
    } catch (error) {
      if (error?.name === "AbortError") return;
      els.recsMeta.textContent = "Error";
    }
  }

  async function loadCharacters(id) {
    els.charsMeta.textContent = "Loading...";
    els.charsList.replaceChildren();

    try {
      if (controllers.chars) controllers.chars.abort();
      controllers.chars = new AbortController();

      const data = await fetchAnime(`/anime/${id}/characters`, { sfw: true }, {
        cacheTtlMs: 60_000,
        signal: controllers.chars.signal,
      });

      const characters = (data?.data || []).slice(0, 12);
      if (!characters.length) {
        els.charsMeta.textContent = "No characters";
        return;
      }

      els.charsMeta.textContent = `${characters.length} shown`;
      const fragment = document.createDocumentFragment();

      characters.forEach((characterEntry) => {
        const name = characterEntry?.character?.name || "Unknown";
        const role = characterEntry?.role || "";
        const imageUrl =
          characterEntry?.character?.images?.webp?.image_url ||
          characterEntry?.character?.images?.jpg?.image_url ||
          "";

        const card = document.createElement("div");
        card.className = "person";

        const image = document.createElement("img");
        image.className = "person__img";
        image.loading = "lazy";
        image.decoding = "async";
        image.alt = name;
        if (imageUrl) image.src = imageUrl;

        const info = document.createElement("div");
        const personName = document.createElement("div");
        personName.className = "person__name";
        personName.textContent = name;

        const personRole = document.createElement("div");
        personRole.className = "person__role";
        personRole.textContent = role;

        info.append(personName, personRole);
        card.append(image, info);
        fragment.appendChild(card);
      });

      els.charsList.appendChild(fragment);
    } catch (error) {
      if (error?.name === "AbortError") return;
      els.charsMeta.textContent = "Error";
    }
  }

  async function loadDetails(id) {
    setDetailsSkeleton();

    try {
      setStatus("Loading details...");

      if (controllers.details) controllers.details.abort();
      controllers.details = new AbortController();

      const data = await fetchAnime(`/anime/${id}`, { sfw: true }, { signal: controllers.details.signal });
      const lite = animeToLite(data?.data);

      if (isAdultAnime(lite)) {
        toast("Content hidden", "18+ content is hidden in SFW mode", "warn", 3000);
        els.detailsTitle.textContent = "Hidden";
        els.detailsSynopsis.textContent = "This title is not shown in SFW mode.";
        return;
      }

      state.activeAnime = lite;

      els.detailsTitle.textContent = lite.title;
      els.detailsScore.textContent = `★ ${formatScore(lite.score)}`;
      els.detailsEpisodes.textContent = `Episodes: ${lite.episodes ?? "--"}`;
      els.detailsSynopsis.textContent = sanitizeText(lite.synopsis) || "No synopsis available.";
      els.detailsImage.src = lite.image || "";
      els.detailsImage.onerror = () => {
        els.detailsImage.src = DETAILS_FALLBACK_POSTER;
      };
      els.detailsMalLink.href = lite.url || "#";

      const queryTitle = lite.title || "";
      els.detailsWatchBtn.href = `https://www.crunchyroll.com/search?q=${encodeURIComponent(queryTitle)}`;
      els.detailsWatchBtn.title = "Search on Crunchyroll";
      els.detailsWatchBtn.oncontextmenu = (event) => {
        event.preventDefault();
        window.open(
          `https://www.google.com/search?q=${encodeURIComponent(`${queryTitle} Crunchyroll`)}`,
          "_blank",
          "noreferrer",
        );
        return false;
      };

      els.detailsFavBtn.disabled = false;
      els.detailsGenres.replaceChildren();

      (lite.genres || []).forEach((genre) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = genre.name;
        els.detailsGenres.appendChild(chip);
      });

      const trailer = data?.data?.trailer?.url;
      if (trailer) {
        els.detailsTrailerBtn.hidden = false;
        els.detailsTrailerBtn.href = trailer;
      } else {
        els.detailsTrailerBtn.hidden = true;
      }

      loadRecommendations(lite.mal_id);
      loadCharacters(lite.mal_id);
      await window.AnimeFlix.recordAnimeVisit?.(lite, { incrementEpisode: true });
      window.AnimeFlix.refreshFavButtons();
      setStatus("");
    } catch (error) {
      if (error?.name === "AbortError") {
        setStatus("");
        return;
      }

      toast("Details error", error.message || "Could not load anime details", "error", 3000);
      els.detailsTitle.textContent = "Could not load details";
      els.detailsSynopsis.textContent = sanitizeText(error.message) || "Unknown error.";
    }
  }

  async function loadGenres() {
    try {
      els.genreMenu.replaceChildren();

      const addItem = (id, name) => {
        const item = document.createElement("div");
        item.className = "selectMenu__item";
        item.setAttribute("role", "option");
        item.setAttribute("data-id", String(id));
        item.setAttribute("aria-selected", String(String(id) === String(state.genreId)));
        item.textContent = name;
        item.addEventListener("click", () => {
          setGenre(String(id), name);
          closeGenreMenu();
        });
        els.genreMenu.appendChild(item);
      };

      addItem("", "All genres");

      const data = await fetchAnime("/genres/anime", { filter: "genres" }, {
        cacheTtlMs: 24 * 60 * 60 * 1000,
      });

      const genres = data?.data || [];
      const seen = new Set();

      const list = genres
        .filter((genre) => genre?.mal_id && genre?.name)
        .filter((genre) => {
          const key = String(genre.mal_id);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice()
        .sort((left, right) => String(left.name).localeCompare(String(right.name)));

      list.forEach((genre) => addItem(String(genre.mal_id), genre.name));

      const firstOption =
        els.genreSelect.querySelector('option[value=""]') ||
        (() => {
          const option = document.createElement("option");
          option.value = "";
          option.textContent = "All genres";
          return option;
        })();

      els.genreSelect.replaceChildren(firstOption);

      list.forEach((genre) => {
        const option = document.createElement("option");
        option.value = String(genre.mal_id);
        option.textContent = genre.name;
        els.genreSelect.appendChild(option);
      });
    } catch {
      // non-blocking
    }
  }

  function openGenreMenu() {
    els.genreMenu.hidden = false;
    els.genreBtn.setAttribute("aria-expanded", "true");
    els.genreWrap?.classList.add("is-open");
  }

  function closeGenreMenu() {
    els.genreMenu.hidden = true;
    els.genreBtn.setAttribute("aria-expanded", "false");
    els.genreWrap?.classList.remove("is-open");
  }

  function setGenre(id, name) {
    state.genreId = id || "";
    els.genreBtnLabel.textContent = name || "All genres";
    els.genreSelect.value = state.genreId;

    const query = els.searchInput.value.trim();
    state.lists.search.q = query;

    if (!query && !state.genreId) {
      els.searchSection.hidden = true;
      setSearchMode(false);
      setStatus("");
      return;
    }

    searchAnime({ reset: true });
  }

  function makeObserver(callback) {
    let cooldown = false;

    return new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || cooldown) return;
          cooldown = true;
          Promise.resolve(callback()).finally(() => {
            setTimeout(() => {
              cooldown = false;
            }, 650);
          });
        });
      },
      { root: null, rootMargin: "800px 0px", threshold: 0.01 },
    );
  }

  function setupInfiniteScroll() {
    makeObserver(() => loadList("trending", els.trendingSlider, els.trendingMeta)).observe(els.trendingSentinel);
    makeObserver(() => loadList("top", els.topSlider, els.topMeta)).observe(els.topSentinel);
    makeObserver(() => loadList("popular", els.popularSlider, els.popularMeta)).observe(els.popularSentinel);
    makeObserver(() => searchAnime()).observe(els.searchSentinel);
  }

  async function onRouteChange() {
    state.route = parseRoute();
    if (state.route.name !== "details") {
      window.AnimeFlix.stopAnimeDetails?.();
    }
    setActiveNav();

    if (state.route.name === "home") {
      showView("home");
      window.AnimeFlix.startHeroRotation(state.heroPool);

      const searchActive =
        (!!state.lists.search.q || !!state.genreId) && els.searchGrid.children.length > 0 && !els.searchSection.hidden;

      if (searchActive) {
        setSearchMode(true);
        els.searchSection.hidden = false;
      } else {
        setSearchMode(false);
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (state.route.name === "favorites") {
      showView("favorites");
      els.searchSection.hidden = true;
      window.AnimeFlix.stopHeroRotation();
      window.AnimeFlix.renderFavoritesPage();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (state.route.name === "profile") {
      if (!window.AnimeFlix.isAuthenticated()) {
        window.AnimeFlix.openAuthGate?.({ mode: "login" });
        history.replaceState(null, "", "/#/login");
        window.dispatchEvent(new PopStateEvent("popstate"));
        return;
      }

      showView("profile");
      els.searchSection.hidden = true;
      setSearchMode(false);
      window.AnimeFlix.stopHeroRotation();
      window.AnimeFlix.renderProfilePage?.();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (state.route.name === "filter") {
      showView("filter");
      els.searchSection.hidden = true;
      setSearchMode(false);
      window.AnimeFlix.stopHeroRotation();
      window.AnimeFlix.renderFilterView?.();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (state.route.name === "login" || state.route.name === "signup") {
      if (window.AnimeFlix.isAuthenticated()) {
        location.hash = "#/";
        return;
      }

      showView("home");
      els.searchSection.hidden = true;
      window.AnimeFlix.stopHeroRotation();
      setStatus("");
      window.AnimeFlix.openAuthGate?.({ mode: state.route.name });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (state.route.name === "details") {
      showView("details");
      els.searchSection.hidden = true;
      window.AnimeFlix.stopHeroRotation();
      if (typeof window.AnimeFlix.loadAnimeDetails === "function") {
        await window.AnimeFlix.loadAnimeDetails(state.route.id);
      } else {
        await loadDetails(state.route.id);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    showView("home");
  }

  function attachEvents() {
    els.themeToggleBtn.addEventListener("click", window.AnimeFlix.toggleTheme);
    els.loginNavBtn.addEventListener("click", () => window.AnimeFlix.openAuthGate?.({ mode: "login" }));
    els.signupNavBtn?.addEventListener("click", () => window.AnimeFlix.openAuthGate?.({ mode: "signup" }));

    els.loginForm.addEventListener("submit", window.AnimeFlix.handleLoginSubmit);
    els.signupForm.addEventListener("submit", window.AnimeFlix.handleSignupSubmit);

    els.profileBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      window.AnimeFlix.toggleProfileMenu();
    });

    const handleLogout = async () => {
      window.AnimeFlix.closeProfileMenu();
      await window.AnimeFlix.logout();
    };

    els.logoutBtn?.addEventListener("click", handleLogout);
    els.profileLogoutBtn.addEventListener("click", handleLogout);

    els.heroDetailsBtn.addEventListener("click", () => {
      if (state.hero?.mal_id) location.hash = `#/anime/${state.hero.mal_id}`;
    });

    els.heroFavBtn.addEventListener("click", () => {
      if (state.hero) window.AnimeFlix.toggleFavorite(state.hero);
    });

    els.heroPrevBtn?.addEventListener("click", window.AnimeFlix.previousHero);
    els.heroNextBtn?.addEventListener("click", window.AnimeFlix.nextHero);
    els.heroDots?.addEventListener("click", (event) => {
      const dot = event.target.closest("[data-hero-page]");
      if (!dot) return;
      window.AnimeFlix.showHeroAt(Number(dot.dataset.heroPage), { restartTimer: true });
    });

    els.detailsBackBtn.addEventListener("click", () => {
      if (history.length > 1) history.back();
      else location.hash = "#/";
    });

    els.detailsFavBtn.addEventListener("click", () => {
      if (state.activeAnime) window.AnimeFlix.toggleFavorite(state.activeAnime);
    });

    els.clearFavoritesBtn.addEventListener("click", async () => {
      const cleared = await window.AnimeFlix.clearFavorites?.();
      if (!cleared) {
        toast("Favorites not cleared", "Could not update favorites right now.", "error", 2200);
        return;
      }
      window.AnimeFlix.renderFavoritesPage();
      window.AnimeFlix.refreshFavButtons();
      window.AnimeFlix.refreshProfilePage?.();
      toast("Favorites cleared", "Your list is now empty.", "warn");
    });

    els.clearContinueBtn.addEventListener("click", async () => {
      await window.AnimeFlix.clearContinueWatching?.();
      toast("Cleared", "Continue watching cleared.", "warn");
    });

    els.clearSearchBtn.addEventListener("click", clearSearch);
    els.searchMoreBtn.addEventListener("click", () => searchAnime({ reset: false }));

    const doSearch = debounce(() => {
      const query = els.searchInput.value.trim();
      state.lists.search.q = query;

      if (!query && state.genreId) {
        searchAnime({ reset: true });
        return;
      }

      if (!query || query.length < 3) {
        if (!state.genreId) {
          els.searchSection.hidden = true;
          setSearchMode(false);
          setStatus("");
        }
        return;
      }

      searchAnime({ reset: true });
    }, 650);

    els.searchInput.addEventListener("input", doSearch);
    els.searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape") clearSearch();
      if (event.key === "Enter") {
        const query = els.searchInput.value.trim();
        state.lists.search.q = query;
        if (!query && !state.genreId) return;
        if (query && query.length < 3) return;
        searchAnime({ reset: true });
      }
    });

    els.genreBtn.addEventListener("click", () => {
      if (els.genreMenu.hidden) openGenreMenu();
      else closeGenreMenu();
    });

    document.addEventListener("click", (event) => {
      const target = event.target;

      if (!(target === els.genreBtn || els.genreBtn.contains(target) || target === els.genreMenu || els.genreMenu.contains(target))) {
        closeGenreMenu();
      }

      if (!(target === els.profileBtn || els.profileBtn.contains(target) || target === els.profileMenu || els.profileMenu.contains(target))) {
        window.AnimeFlix.closeProfileMenu();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeGenreMenu();
        window.AnimeFlix.closeProfileMenu();
      }
    });

    window.addEventListener("hashchange", onRouteChange);
    window.addEventListener("popstate", onRouteChange);

    els.trendingMoreBtn.addEventListener("click", () => loadList("trending", els.trendingSlider, els.trendingMeta));
    els.topMoreBtn.addEventListener("click", () => loadList("top", els.topSlider, els.topMeta));
    els.popularMoreBtn.addEventListener("click", () => loadList("popular", els.popularSlider, els.popularMeta));
  }

  async function init() {
    window.AnimeFlix.loadProfileState?.();
    window.AnimeFlix.loadTheme();
    window.AnimeFlix.initAuthGate?.();
    window.AnimeFlix.renderContinue();
    window.AnimeFlix.renderFavoritesPage();
    window.AnimeFlix.updateAuthUI();

    attachEvents();
    setupInfiniteScroll();
    loadGenres();

    const sessionPromise = window.AnimeFlix.restoreSession();
    
    // Load hero first, then stagger list loads to avoid rate limits
    const contentPromise = (async () => {
      await loadHero();
      await sleep(800);
      await loadList("trending", els.trendingSlider, els.trendingMeta);
      await sleep(800);
      await loadList("top", els.topSlider, els.topMeta);
      await sleep(800);
      await loadList("popular", els.popularSlider, els.popularMeta);
    })();

    await sessionPromise;
    await onRouteChange();
    await contentPromise;

    window.AnimeFlix.renderContinue();
    window.AnimeFlix.renderFavoritesPage();
    window.AnimeFlix.refreshFavButtons();
  }

  window.AnimeFlix.init = init;
})();
