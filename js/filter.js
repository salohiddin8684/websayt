/* AnimeFlix browse filter page */
(function () {
  "use strict";

  const app = window.AnimeFlix;
  if (!app) return;

  const { fetchAnime, animeToLite, isAdultAnime, formatScore, debounce, sleep, state, toast } = app;

  const PAGE_SIZE = 24;
  const MIN_YEAR = 2000;
  const MAX_YEAR = 2025;
  const CARD_FALLBACK_POSTER =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 600'%3E%3Crect width='420' height='600' fill='%231a1a2e'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%239ca3af' font-family='Arial' font-size='24' dy='.3em'%3ENo Poster%3C/text%3E%3C/svg%3E";

  const TYPE_OPTIONS = [
    { value: "tv", label: "TV" },
    { value: "movie", label: "Movie" },
    { value: "ova", label: "OVA" },
    { value: "ona", label: "ONA" },
    { value: "special", label: "Special" },
    { value: "music", label: "Music" },
  ];

  const STATUS_OPTIONS = [
    { value: "airing", label: "Airing" },
    { value: "complete", label: "Complete" },
    { value: "upcoming", label: "Upcoming" },
  ];

  const RATING_OPTIONS = [
    { value: "g", label: "G" },
    { value: "pg", label: "PG" },
    { value: "pg13", label: "PG-13" },
    { value: "r17", label: "R-17" },
    { value: "r", label: "R+" },
  ];

  const SEASON_OPTIONS = [
    { value: "winter", label: "Winter" },
    { value: "spring", label: "Spring" },
    { value: "summer", label: "Summer" },
    { value: "fall", label: "Fall" },
  ];

  const SORT_OPTIONS = [
    { value: "score", label: "Score" },
    { value: "popularity", label: "Popularity" },
    { value: "title", label: "Title" },
    { value: "episodes", label: "Episodes" },
  ];

  const ORDER_OPTIONS = [
    { value: "desc", label: "Kamayish" },
    { value: "asc", label: "O'sish" },
  ];

  const FALLBACK_GENRES = [
    { mal_id: 1, name: "Action" },
    { mal_id: 2, name: "Adventure" },
    { mal_id: 4, name: "Comedy" },
    { mal_id: 8, name: "Drama" },
    { mal_id: 10, name: "Fantasy" },
    { mal_id: 7, name: "Mystery" },
    { mal_id: 22, name: "Romance" },
    { mal_id: 24, name: "Sci-Fi" },
    { mal_id: 36, name: "Slice of Life" },
    { mal_id: 37, name: "Supernatural" },
  ];

  let root = null;
  let controller = null;
  let requestSeq = 0;
  let initialized = false;
  let genres = [];
  let retryTimer = 0;

  let filters = createDefaultFilters();
  let viewState = createDefaultViewState();

  const debouncedReload = debounce(() => loadResults({ reset: true }), 420);

  function createDefaultFilters() {
    return {
      q: "",
      genre: "",
      type: "",
      status: "",
      rating: "",
      season: "",
      year: "",
      sort: "score",
      order: "desc",
    };
  }

  function createDefaultViewState() {
    return {
      items: [],
      page: 1,
      hasNext: true,
      loading: false,
      total: 0,
      error: "",
    };
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);
  }

  function renderFilterView() {
    root = document.getElementById("filterRoot");
    if (!root) return;

    if (!initialized) {
      root.innerHTML = renderShell();
      bindEvents();
      initialized = true;
      syncControls();
      renderGenrePills(true);
      loadGenres();
      loadResults({ reset: true });
      return;
    }

    syncControls();
    if (!viewState.items.length && !viewState.loading) loadResults({ reset: true });
  }

  function renderShell() {
    return `
      <div class="afBrowse">
        <div class="afBrowse__mobileTop">
          <button class="afDrawerBtn" type="button" data-open-drawer>
            <span>Filters</span>
            <span class="afDrawerBtn__count" data-active-count hidden>0</span>
          </button>
          <span class="afResultCount" data-result-count>Yuklanmoqda...</span>
        </div>

        <div class="afBrowse__layout">
          <aside class="afFilterPanel" aria-label="Anime filters">
            ${renderFilterPanel()}
          </aside>

          <section class="afResults" aria-live="polite">
            <div class="afResults__head">
              <div>
                <p class="afResults__eyebrow">Browse</p>
                <h1 class="afResults__title">Advanced Anime Filter</h1>
              </div>
              <div class="afSortBar">
                <span class="afResultCount" data-result-count>Yuklanmoqda...</span>
                <label class="afSelectWrap" aria-label="Sort by">
                  <select class="afSelect" data-filter-field="sort">
                    ${renderOptions(SORT_OPTIONS)}
                  </select>
                </label>
                <label class="afSelectWrap" aria-label="Sort order">
                  <select class="afSelect" data-filter-field="order">
                    ${renderOptions(ORDER_OPTIONS)}
                  </select>
                </label>
              </div>
            </div>

            <div class="afActiveTags" data-active-tags></div>
            <div class="afGrid" data-results-grid></div>
            <div class="afLoadingMore" data-loading-more hidden>Yuklanmoqda...</div>
            <button class="afLoadMoreBtn" type="button" data-load-more hidden>Ko'proq yuklash</button>
          </section>
        </div>

        <div class="afDrawer" data-drawer hidden>
          <button class="afDrawer__backdrop" type="button" data-close-drawer aria-label="Close filters"></button>
          <aside class="afDrawer__panel" aria-label="Anime filters">
            <div class="afDrawer__head">
              <strong>Filters</strong>
              <button class="afIconBtn" type="button" data-close-drawer aria-label="Close filters">x</button>
            </div>
            ${renderFilterPanel()}
          </aside>
        </div>
      </div>
    `;
  }

  function renderFilterPanel() {
    return `
      <div class="afFilterPanel__inner">
        <label class="afSearch" aria-label="Search anime by name">
          <span class="afSearch__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Zm5.4-2.1L21 21" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
          </span>
          <input class="afSearch__input" type="search" data-filter-field="q" placeholder="Anime nomi..." autocomplete="off" />
          <button class="afSearch__clear" type="button" data-clear-search aria-label="Clear search">x</button>
        </label>

        ${renderSection("Janr", '<div class="afPills" data-genre-list></div>')}
        ${renderSection("Tur", renderPillGroup("type", TYPE_OPTIONS))}
        ${renderSection("Holat", renderPillGroup("status", STATUS_OPTIONS))}
        ${renderSection("Yosh chegarasi", renderPillGroup("rating", RATING_OPTIONS))}
        ${renderSection("Mavsum", `
          <div class="afPills">${renderPillButtons("season", SEASON_OPTIONS)}</div>
          <label class="afSelectWrap afSelectWrap--full" aria-label="Year">
            <select class="afSelect" data-filter-field="year">
              <option value="">Yil</option>
              ${renderYearOptions()}
            </select>
          </label>
        `)}

        <div class="afPanelActions">
          <button class="afResetBtn" type="button" data-clear-all>Hammasini tozalash</button>
        </div>
      </div>
    `;
  }

  function renderSection(title, body) {
    return `
      <section class="afFilterGroup">
        <h2 class="afFilterGroup__title">${escapeHtml(title)}</h2>
        ${body}
      </section>
    `;
  }

  function renderPillGroup(field, options) {
    return `<div class="afPills">${renderPillButtons(field, options)}</div>`;
  }

  function renderPillButtons(field, options) {
    return options.map((option) => `
      <button class="afPill" type="button" data-filter-choice="${escapeHtml(field)}" data-value="${escapeHtml(option.value)}">
        ${escapeHtml(option.label)}
      </button>
    `).join("");
  }

  function renderOptions(options) {
    return options.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join("");
  }

  function renderYearOptions() {
    const years = [];
    for (let year = MAX_YEAR; year >= MIN_YEAR; year -= 1) {
      years.push(`<option value="${year}">${year}</option>`);
    }
    return years.join("");
  }

  async function loadGenres() {
    try {
      const data = await fetchAnime("/genres/anime", {}, { cacheTtlMs: 24 * 60 * 60 * 1000 });
      genres = (data?.data || [])
        .filter((genre) => genre?.mal_id && genre?.name)
        .map((genre) => ({ mal_id: Number(genre.mal_id), name: String(genre.name) }))
        .sort((left, right) => left.name.localeCompare(right.name));
      renderGenrePills(false);
    } catch {
      genres = FALLBACK_GENRES;
      renderGenrePills(false);
    }
  }

  function renderGenrePills(loading) {
    root?.querySelectorAll("[data-genre-list]").forEach((host) => {
      if (loading) {
        host.innerHTML = Array.from({ length: 8 }).map(() => '<span class="afPill afPill--loading"></span>').join("");
        return;
      }

      const list = genres.length ? genres : FALLBACK_GENRES;
      host.innerHTML = list.map((genre) => `
        <button class="afPill" type="button" data-genre-id="${escapeHtml(genre.mal_id)}">
          ${escapeHtml(genre.name)}
        </button>
      `).join("");
    });
    syncControls();
  }

  function bindEvents() {
    root.addEventListener("click", (event) => {
      const target = event.target;
      const choice = target.closest("[data-filter-choice]");
      const genreButton = target.closest("[data-genre-id]");
      const clearButton = target.closest("[data-clear-filter]");
      const card = target.closest("[data-open-anime]");
      const favoriteButton = target.closest("[data-filter-fav]");

      if (target.closest("[data-open-drawer]")) {
        setDrawerOpen(true);
        return;
      }

      if (target.closest("[data-close-drawer]")) {
        setDrawerOpen(false);
        return;
      }

      if (target.closest("[data-clear-all]")) {
        filters = createDefaultFilters();
        syncControls();
        setDrawerOpen(false);
        loadResults({ reset: true });
        return;
      }

      if (target.closest("[data-clear-search]")) {
        filters.q = "";
        syncControls();
        loadResults({ reset: true });
        return;
      }

      if (clearButton) {
        clearFilter(clearButton.getAttribute("data-clear-filter"));
        return;
      }

      if (genreButton) {
        const value = String(genreButton.getAttribute("data-genre-id") || "");
        filters.genre = filters.genre === value ? "" : value;
        syncControls();
        loadResults({ reset: true });
        return;
      }

      if (choice) {
        const field = choice.getAttribute("data-filter-choice");
        const value = choice.getAttribute("data-value") || "";
        if (!Object.prototype.hasOwnProperty.call(filters, field)) return;
        filters[field] = filters[field] === value ? "" : value;
        syncControls();
        loadResults({ reset: true });
        return;
      }

      if (favoriteButton) {
        event.preventDefault();
        event.stopPropagation();
        const anime = findItemById(favoriteButton.getAttribute("data-filter-fav"));
        if (anime) {
          app.toggleFavorite?.(anime);
          syncFavoriteButtons();
        }
        return;
      }

      if (target.closest("[data-load-more]")) {
        loadResults({ reset: false });
        return;
      }

      if (target.closest("[data-watch-anime]")) {
        const animeId = target.closest("[data-watch-anime]").getAttribute("data-watch-anime");
        if (animeId) location.hash = `#/anime/${animeId}`;
        return;
      }

      if (card && !target.closest("button, a")) {
        const animeId = card.getAttribute("data-open-anime");
        if (animeId) location.hash = `#/anime/${animeId}`;
      }
    });

    root.addEventListener("keydown", (event) => {
      const card = event.target.closest("[data-open-anime]");
      if (!card) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        location.hash = `#/anime/${card.getAttribute("data-open-anime")}`;
      }
    });

    root.addEventListener("change", (event) => {
      const field = event.target.getAttribute("data-filter-field");
      if (!field || !Object.prototype.hasOwnProperty.call(filters, field)) return;
      filters[field] = String(event.target.value || "");
      syncControls();
      loadResults({ reset: true });
    });

    root.addEventListener("input", (event) => {
      const field = event.target.getAttribute("data-filter-field");
      if (field !== "q") return;
      filters.q = String(event.target.value || "").slice(0, 90);
      syncControls();
      debouncedReload();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setDrawerOpen(false);
    });
  }

  function setDrawerOpen(open) {
    root?.querySelectorAll("[data-drawer]").forEach((drawer) => {
      drawer.hidden = !open;
    });
    document.body.classList.toggle("browse-drawer-open", open);
  }

  function clearFilter(field) {
    if (field === "sort") {
      filters.sort = "score";
    } else if (field === "order") {
      filters.order = "desc";
    } else if (Object.prototype.hasOwnProperty.call(filters, field)) {
      filters[field] = "";
    }
    syncControls();
    loadResults({ reset: true });
  }

  function syncControls() {
    if (!root) return;

    root.querySelectorAll("[data-filter-field]").forEach((element) => {
      const field = element.getAttribute("data-filter-field");
      if (!Object.prototype.hasOwnProperty.call(filters, field)) return;
      if (element === document.activeElement && field === "q") return;
      element.value = filters[field] || "";
    });

    root.querySelectorAll("[data-filter-choice]").forEach((button) => {
      const field = button.getAttribute("data-filter-choice");
      const value = button.getAttribute("data-value") || "";
      button.classList.toggle("is-active", filters[field] === value);
    });

    root.querySelectorAll("[data-genre-id]").forEach((button) => {
      button.classList.toggle("is-active", filters.genre === String(button.getAttribute("data-genre-id") || ""));
    });

    root.querySelectorAll("[data-clear-search]").forEach((button) => {
      button.hidden = !filters.q.trim();
    });

    renderActiveTags();
    updateResultCount();
    syncFavoriteButtons();
  }

  function renderActiveTags() {
    const tags = [];
    if (filters.q.trim()) tags.push(activeTag(`Qidiruv: ${filters.q.trim()}`, "q"));
    if (filters.genre) tags.push(activeTag(`Janr: ${genreName(filters.genre)}`, "genre"));
    if (filters.type) tags.push(activeTag(`Tur: ${labelFor(TYPE_OPTIONS, filters.type)}`, "type"));
    if (filters.status) tags.push(activeTag(`Holat: ${labelFor(STATUS_OPTIONS, filters.status)}`, "status"));
    if (filters.rating) tags.push(activeTag(`Yosh: ${labelFor(RATING_OPTIONS, filters.rating)}`, "rating"));
    if (filters.season) tags.push(activeTag(`Mavsum: ${labelFor(SEASON_OPTIONS, filters.season)}`, "season"));
    if (filters.year) tags.push(activeTag(`Yil: ${filters.year}`, "year"));
    if (filters.sort !== "score") tags.push(activeTag(`Saralash: ${labelFor(SORT_OPTIONS, filters.sort)}`, "sort"));
    if (filters.order !== "desc") tags.push(activeTag(`Tartib: ${labelFor(ORDER_OPTIONS, filters.order)}`, "order"));

    root.querySelectorAll("[data-active-tags]").forEach((host) => {
      host.innerHTML = tags.length
        ? `${tags.join("")}<button class="afClearAll" type="button" data-clear-all>Hammasini tozalash</button>`
        : "";
    });

    root.querySelectorAll("[data-active-count]").forEach((element) => {
      element.hidden = tags.length === 0;
      element.textContent = String(tags.length);
    });
  }

  function activeTag(label, field) {
    return `
      <button class="afActiveTag" type="button" data-clear-filter="${escapeHtml(field)}">
        <span>${escapeHtml(label)}</span>
        <span aria-hidden="true">x</span>
      </button>
    `;
  }

  function labelFor(options, value) {
    return options.find((option) => option.value === value)?.label || value;
  }

  function genreName(id) {
    const genre = genres.find((item) => String(item.mal_id) === String(id)) ||
      FALLBACK_GENRES.find((item) => String(item.mal_id) === String(id));
    return genre?.name || id;
  }

  function getSeasonRange() {
    const year = Number.parseInt(filters.year, 10);
    if (!Number.isFinite(year) || !filters.season) return null;
    const ranges = {
      winter: ["01-01", "03-31"],
      spring: ["04-01", "06-30"],
      summer: ["07-01", "09-30"],
      fall: ["10-01", "12-31"],
    };
    const range = ranges[filters.season];
    return range ? { start: `${year}-${range[0]}`, end: `${year}-${range[1]}` } : null;
  }

  function buildApiParams() {
    const params = {
      page: viewState.page,
      limit: PAGE_SIZE,
      sfw: "true",
      order_by: filters.sort,
      sort: filters.order,
    };

    const query = filters.q.trim();
    if (query) params.q = query;
    if (filters.genre) params.genres = filters.genre;
    if (filters.type) params.type = filters.type;
    if (filters.status) params.status = filters.status;
    if (filters.rating) params.rating = filters.rating;

    const seasonRange = getSeasonRange();
    if (seasonRange) {
      params.start_date = seasonRange.start;
      params.end_date = seasonRange.end;
    } else if (filters.year) {
      params.start_date = `${filters.year}-01-01`;
      params.end_date = `${filters.year}-12-31`;
    }

    return params;
  }

  function matchesClientFilters(lite) {
    if (!lite || isAdultAnime?.(lite)) return false;
    if (filters.year && lite.year && Number(lite.year) !== Number(filters.year)) return false;
    if (filters.season && lite.season && String(lite.season).toLowerCase() !== filters.season) return false;
    return true;
  }

  async function loadResults({ reset = false } = {}) {
    if (viewState.loading && !reset) return;
    window.clearTimeout(retryTimer);
    let waitingForRateLimit = false;

    const seq = requestSeq + 1;
    requestSeq = seq;

    if (reset) {
      controller?.abort();
      controller = new AbortController();
      viewState = createDefaultViewState();
      renderSkeletons();
    } else if (!controller || controller.signal.aborted) {
      controller = new AbortController();
    }

    viewState.loading = true;
    viewState.error = "";
    updateResultCount();
    setLoadingMore(true);

    try {
      const data = await fetchAnime("/anime", buildApiParams(), {
        cacheTtlMs: 35_000,
        signal: controller.signal,
      });

      if (seq !== requestSeq) return;

      const incoming = (data?.data || [])
        .map(animeToLite)
        .filter(matchesClientFilters);

      viewState.items = reset ? incoming : mergeItems(viewState.items, incoming);
      viewState.total = Number(data?.pagination?.items?.total || viewState.total || 0);
      viewState.hasNext = !!data?.pagination?.has_next_page;
      viewState.page += 1;
      renderResults();
    } catch (error) {
      if (error?.name === "AbortError") return;
      const message = error?.message || "";
      if (message.includes("429") || message.toLowerCase().includes("too many")) {
        waitingForRateLimit = true;
        keepLoadingForRateLimit(seq, reset);
        return;
      }
      viewState.error = message || "Anime ro'yxati yuklanmadi.";
      renderError(viewState.error);
    } finally {
      if (seq === requestSeq && !viewState.error && !waitingForRateLimit) {
        viewState.loading = false;
        setLoadingMore(false);
        updateResultCount();
      }
    }
  }

  function keepLoadingForRateLimit(seq, reset) {
    if (seq !== requestSeq) return;
    root?.querySelectorAll("[data-result-count]").forEach((element) => {
      element.textContent = "Yuklanmoqda...";
    });
    retryTimer = window.setTimeout(() => {
      if (seq !== requestSeq) return;
      viewState.loading = false;
      loadResults({ reset: reset && !viewState.items.length });
    }, 1500);
  }

  function mergeItems(existing, incoming) {
    const map = new Map();
    existing.concat(incoming).forEach((anime) => {
      if (anime?.mal_id) map.set(Number(anime.mal_id), anime);
    });
    return Array.from(map.values());
  }

  function renderSkeletons() {
    const grid = root?.querySelector("[data-results-grid]");
    if (!grid) return;
    grid.innerHTML = Array.from({ length: 8 }).map(() => `
      <article class="afSkeleton">
        <div class="afSkeleton__poster"></div>
        <div class="afSkeleton__body">
          <div class="afSkeleton__line"></div>
          <div class="afSkeleton__line afSkeleton__line--short"></div>
          <div class="afSkeleton__line afSkeleton__line--tiny"></div>
        </div>
      </article>
    `).join("");
  }

  function renderResults() {
    const grid = root?.querySelector("[data-results-grid]");
    if (!grid) return;

    if (!viewState.items.length) {
      grid.innerHTML = `
        <div class="afEmpty">
          <h2>Natija topilmadi</h2>
          <p>Tanlangan filterlarni kamaytirib ko'ring.</p>
          <button class="afLoadMoreBtn" type="button" data-clear-all>Hammasini tozalash</button>
        </div>
      `;
      updateLoadMoreButton();
      return;
    }

    grid.innerHTML = viewState.items.map(renderAnimeCard).join("");
    syncFavoriteButtons();
    updateLoadMoreButton();
  }

  function renderError(message) {
    const grid = root?.querySelector("[data-results-grid]");
    if (!grid) return;
    grid.innerHTML = `
      <div class="afEmpty">
        <h2>Anime ro'yxati yuklanmadi</h2>
        <p>${escapeHtml(message)}</p>
        <button class="afLoadMoreBtn" type="button" data-load-more>Qayta urinish</button>
      </div>
    `;
    viewState.loading = false;
    setLoadingMore(false);
    updateResultCount();
  }

  function renderAnimeCard(lite) {
    const favorite = state.favorites?.has?.(Number(lite.mal_id));
    const status = lite.status ? shortStatus(lite.status) : "TBA";
    const episodes = lite.episodes ? `${lite.episodes} ep` : "Epizodlar TBA";
    const type = lite.type || "Anime";

    return `
      <article class="afCard" data-open-anime="${escapeHtml(lite.mal_id)}" tabindex="0" role="button" aria-label="${escapeHtml(lite.title)} details">
        <div class="afCard__poster">
          <img src="${escapeHtml(lite.image || CARD_FALLBACK_POSTER)}" alt="${escapeHtml(lite.title)} poster" loading="lazy" decoding="async" onerror="this.src='${CARD_FALLBACK_POSTER}'" />
          <div class="afCard__overlay">
            <div class="afCard__actions">
              <button class="afCard__watch" type="button" data-watch-anime="${escapeHtml(lite.mal_id)}">Tomosha qilish</button>
              <button class="afCard__favorite${favorite ? " is-on" : ""}" type="button" data-filter-fav="${escapeHtml(lite.mal_id)}">${favorite ? "Saqlangan" : "Sevimli"}</button>
            </div>
          </div>
          <span class="afCard__rating"><span aria-hidden="true">★</span> ${escapeHtml(formatScore(lite.score))}</span>
        </div>
        <div class="afCard__body">
          <h2 class="afCard__title">${escapeHtml(lite.title)}</h2>
          <div class="afCard__meta">
            <span>${escapeHtml(episodes)}</span>
            <span>${escapeHtml(type)}</span>
          </div>
          <span class="afCard__status">${escapeHtml(status)}</span>
        </div>
      </article>
    `;
  }

  function shortStatus(status) {
    const value = String(status || "").toLowerCase();
    if (value.includes("airing")) return "Airing";
    if (value.includes("not yet")) return "Upcoming";
    if (value.includes("finished")) return "Complete";
    return status;
  }

  function setLoadingMore(active) {
    root?.querySelectorAll("[data-loading-more]").forEach((element) => {
      element.hidden = !active || !viewState.items.length;
    });
    updateLoadMoreButton();
  }

  function updateLoadMoreButton() {
    root?.querySelectorAll("[data-load-more]").forEach((button) => {
      button.hidden = !viewState.hasNext || viewState.loading || !viewState.items.length;
    });
  }

  function updateResultCount() {
    const label = getResultLabel();
    root?.querySelectorAll("[data-result-count]").forEach((element) => {
      element.textContent = label;
    });
  }

  function getResultLabel() {
    if (viewState.loading && !viewState.items.length) return "Yuklanmoqda...";
    if (viewState.error) return "Yuklashda xatolik";
    if (viewState.total) return `${formatCompact(viewState.total)} natija, ${viewState.items.length} yuklandi`;
    if (viewState.items.length) return `${viewState.items.length} anime yuklandi`;
    return "Filterlarni tanlang";
  }

  function formatCompact(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
    if (number >= 1000) return `${Math.round(number / 1000)}K`;
    return String(number);
  }

  function findItemById(id) {
    const animeId = Number(id);
    return viewState.items.find((anime) => Number(anime.mal_id) === animeId);
  }

  function syncFavoriteButtons() {
    root?.querySelectorAll("[data-filter-fav]").forEach((button) => {
      const active = state.favorites?.has?.(Number(button.getAttribute("data-filter-fav")));
      button.classList.toggle("is-on", !!active);
      button.textContent = active ? "Saqlangan" : "Sevimli";
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  app.renderFilterView = renderFilterView;
})();
