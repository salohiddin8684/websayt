/* AnimeFlix premium anime filter page */
(function () {
  "use strict";

  const app = window.AnimeFlix;
  if (!app) return;

  const {
    fetchAnime,
    animeToLite,
    isAdultAnime,
    formatScore,
    toast,
    debounce,
    state,
  } = app;

  const CURRENT_YEAR = new Date().getFullYear();
  const PAGE_SIZE = 24;
  const CARD_FALLBACK_POSTER =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 600'%3E%3Crect width='420' height='600' fill='%23111827'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23e5e7eb' font-family='Arial' font-size='24' dy='.3em'%3ENo Poster%3C/text%3E%3C/svg%3E";

  const STORAGE_KEYS = {
    presets: "animeflix:filterPresets:v1",
    recent: "animeflix:filterRecent:v1",
    bookmarks: "animeflix:bookmarks:v1",
  };

  const GENRES = [
    { id: "1", name: "Action" },
    { id: "2", name: "Adventure" },
    { id: "4", name: "Comedy" },
    { id: "8", name: "Drama" },
    { id: "10", name: "Fantasy" },
    { id: "14", name: "Horror" },
    { id: "7", name: "Mystery" },
    { id: "22", name: "Romance" },
    { id: "24", name: "Sci-Fi" },
    { id: "36", name: "Slice of Life" },
    { id: "30", name: "Sports" },
    { id: "37", name: "Supernatural" },
    { id: "9", name: "Ecchi" },
    { id: "35", name: "Harem" },
    { id: "40", name: "Psychological" },
    { id: "62", name: "Isekai" },
    { id: "18", name: "Mecha" },
    { id: "19", name: "Music" },
    { id: "23", name: "School" },
    { id: "41", name: "Suspense" },
    { id: "27", name: "Shounen" },
    { id: "25", name: "Shoujo" },
    { id: "42", name: "Seinen" },
    { id: "43", name: "Josei" },
  ];

  const GENRE_BY_ID = new Map(GENRES.map((genre) => [genre.id, genre]));

  const YEAR_PRESETS = [
    { value: "", label: "Any year" },
    { value: "custom", label: "Custom range" },
    { value: "last3", label: "Last 3 years", from: CURRENT_YEAR - 2, to: CURRENT_YEAR },
    { value: "last5", label: "Last 5 years", from: CURRENT_YEAR - 4, to: CURRENT_YEAR },
    { value: "2020s", label: "2020s", from: 2020, to: CURRENT_YEAR },
    { value: "2010s", label: "2010s", from: 2010, to: 2019 },
    { value: "2000s", label: "2000s", from: 2000, to: 2009 },
    { value: "classic", label: "Before 2000", from: 1960, to: 1999 },
  ];

  const SEASONS = [
    { value: "", label: "Any season" },
    { value: "winter", label: "Winter" },
    { value: "spring", label: "Spring" },
    { value: "summer", label: "Summer" },
    { value: "fall", label: "Fall" },
  ];

  const FORMATS = [
    { value: "", label: "Any format" },
    { value: "tv", label: "TV" },
    { value: "movie", label: "Movie" },
    { value: "ova", label: "OVA" },
    { value: "ona", label: "ONA" },
    { value: "special", label: "Special" },
  ];

  const STATUSES = [
    { value: "", label: "Any status" },
    { value: "finished", label: "Finished" },
    { value: "releasing", label: "Releasing" },
    { value: "upcoming", label: "Upcoming" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const STUDIOS = [
    { value: "", label: "Any studio" },
    { value: "569", label: "MAPPA" },
    { value: "43", label: "ufotable" },
    { value: "4", label: "Bones" },
    { value: "2", label: "Kyoto Animation" },
    { value: "11", label: "Madhouse" },
    { value: "858", label: "Wit Studio" },
    { value: "56", label: "A-1 Pictures" },
    { value: "1835", label: "CloverWorks" },
    { value: "18", label: "Toei Animation" },
    { value: "1", label: "Pierrot" },
    { value: "803", label: "Trigger" },
    { value: "10", label: "Production I.G" },
  ];

  const EPISODE_RANGES = [
    { value: "", label: "Any length" },
    { value: "1-12", label: "1-12 episodes" },
    { value: "13-24", label: "13-24 episodes" },
    { value: "25-52", label: "25-52 episodes" },
    { value: "53+", label: "53+ episodes" },
  ];

  const POPULARITY_RANGES = [
    { value: "", label: "Any popularity" },
    { value: "blockbuster", label: "Blockbuster" },
    { value: "mainstream", label: "Mainstream" },
    { value: "niche", label: "Niche" },
    { value: "hidden", label: "Hidden gems" },
  ];

  const SORTS = [
    { value: "trending", label: "Trending", orderBy: "members", sort: "desc" },
    { value: "popularity", label: "Popularity", orderBy: "popularity", sort: "asc" },
    { value: "rated", label: "Highest Rated", orderBy: "score", sort: "desc" },
    { value: "newest", label: "Newest", orderBy: "start_date", sort: "desc" },
    { value: "oldest", label: "Oldest", orderBy: "start_date", sort: "asc" },
    { value: "watched", label: "Most Watched", orderBy: "members", sort: "desc" },
    { value: "az", label: "Alphabetical", orderBy: "title", sort: "asc" },
  ];

  let filters = createDefaultFilters();
  let viewState = createDefaultViewState();
  let root = null;
  let controller = null;
  let observer = null;
  let initialized = false;
  let requestSeq = 0;
  let lastUrlSearch = "";

  const debouncedReload = debounce(() => loadResults({ reset: true }), 520);

  function createDefaultFilters() {
    return {
      q: "",
      includeGenres: [],
      excludeGenres: [],
      genreMode: "or",
      yearPreset: "",
      yearFrom: "",
      yearTo: "",
      season: "",
      format: "",
      status: "",
      studio: "",
      episodes: "",
      minScore: 0,
      popularity: "",
      sort: "trending",
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

  function clampNumber(value, min, max) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return min;
    return Math.max(min, Math.min(max, parsed));
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore quota errors.
    }
  }

  function splitIds(value) {
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function uniqueList(list) {
    return Array.from(new Set((list || []).map((item) => String(item || "").trim()).filter(Boolean)));
  }

  function readFiltersFromUrl() {
    const params = new URLSearchParams(location.search);
    const next = createDefaultFilters();

    next.q = String(params.get("q") || "").slice(0, 90);
    next.includeGenres = uniqueList(splitIds(params.get("genres"))).filter((id) => GENRE_BY_ID.has(id));
    next.excludeGenres = uniqueList(splitIds(params.get("exclude"))).filter((id) => GENRE_BY_ID.has(id));
    next.genreMode = params.get("logic") === "and" ? "and" : "or";
    next.yearPreset = YEAR_PRESETS.some((preset) => preset.value === params.get("year")) ? params.get("year") || "" : "";
    next.yearFrom = normalizeYear(params.get("from"));
    next.yearTo = normalizeYear(params.get("to"));
    next.season = valueFromList(SEASONS, params.get("season"));
    next.format = valueFromList(FORMATS, params.get("format"));
    next.status = valueFromList(STATUSES, params.get("status"));
    next.studio = valueFromList(STUDIOS, params.get("studio"));
    next.episodes = valueFromList(EPISODE_RANGES, params.get("episodes"));
    next.minScore = clampNumber(params.get("score"), 0, 10);
    next.popularity = valueFromList(POPULARITY_RANGES, params.get("popularity"));
    next.sort = valueFromList(SORTS, params.get("sort")) || "trending";

    return next;
  }

  function valueFromList(list, value) {
    const normalized = String(value || "");
    return list.some((item) => item.value === normalized) ? normalized : "";
  }

  function normalizeYear(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1940 || parsed > CURRENT_YEAR + 5) return "";
    return String(parsed);
  }

  function queryHasFilters() {
    return location.search.length > 1;
  }

  function writeFiltersToUrl() {
    const params = new URLSearchParams();
    const query = filters.q.trim();

    if (query) params.set("q", query);
    if (filters.includeGenres.length) params.set("genres", filters.includeGenres.join(","));
    if (filters.excludeGenres.length) params.set("exclude", filters.excludeGenres.join(","));
    if (filters.genreMode === "and") params.set("logic", "and");
    if (filters.yearPreset) params.set("year", filters.yearPreset);
    if (filters.yearFrom) params.set("from", filters.yearFrom);
    if (filters.yearTo) params.set("to", filters.yearTo);
    if (filters.season) params.set("season", filters.season);
    if (filters.format) params.set("format", filters.format);
    if (filters.status) params.set("status", filters.status);
    if (filters.studio) params.set("studio", filters.studio);
    if (filters.episodes) params.set("episodes", filters.episodes);
    if (filters.minScore > 0) params.set("score", String(filters.minScore));
    if (filters.popularity) params.set("popularity", filters.popularity);
    if (filters.sort && filters.sort !== "trending") params.set("sort", filters.sort);

    const queryString = params.toString();
    const appPath = location.pathname.startsWith("/profile") ? "/" : location.pathname || "/";
    const nextUrl = `${appPath}${queryString ? `?${queryString}` : ""}#/filter`;

    if (`${location.pathname}${location.search}${location.hash}` !== nextUrl) {
      history.replaceState(null, "", nextUrl);
    }

    lastUrlSearch = queryString ? `?${queryString}` : "";
  }

  function getYearRange() {
    const preset = YEAR_PRESETS.find((item) => item.value === filters.yearPreset && item.from);
    if (preset) return { from: preset.from, to: preset.to };

    const from = Number.parseInt(filters.yearFrom, 10);
    const to = Number.parseInt(filters.yearTo, 10);

    if (!Number.isFinite(from) && !Number.isFinite(to)) return { from: null, to: null };
    if (Number.isFinite(from) && Number.isFinite(to) && from > to) return { from: to, to: from };
    return {
      from: Number.isFinite(from) ? from : null,
      to: Number.isFinite(to) ? to : null,
    };
  }

  function getSeasonDateRange() {
    if (!filters.season) return null;
    const yearRange = getYearRange();
    if (!yearRange.from || yearRange.from !== yearRange.to) return null;

    const year = yearRange.from;
    const seasonMap = {
      winter: ["01-01", "03-31"],
      spring: ["04-01", "06-30"],
      summer: ["07-01", "09-30"],
      fall: ["10-01", "12-31"],
    };

    const range = seasonMap[filters.season];
    return range ? { start: `${year}-${range[0]}`, end: `${year}-${range[1]}` } : null;
  }

  function buildApiParams() {
    const selectedSort = SORTS.find((item) => item.value === filters.sort) || SORTS[0];
    const yearRange = getYearRange();
    const seasonRange = getSeasonDateRange();
    const statusMap = {
      finished: "complete",
      releasing: "airing",
      upcoming: "upcoming",
    };

    const params = {
      page: viewState.page,
      limit: PAGE_SIZE,
      sfw: "true",
      order_by: selectedSort.orderBy,
      sort: selectedSort.sort,
    };

    if (filters.q.trim()) params.q = filters.q.trim();
    if (filters.includeGenres.length) params.genres = filters.includeGenres.join(",");
    if (filters.excludeGenres.length) params.genres_exclude = filters.excludeGenres.join(",");
    if (filters.format) params.type = filters.format;
    if (statusMap[filters.status]) params.status = statusMap[filters.status];
    if (filters.studio) params.producers = filters.studio;
    if (filters.minScore > 0) params.min_score = filters.minScore;

    if (yearRange.from) params.start_date = `${yearRange.from}-01-01`;
    if (yearRange.to) params.end_date = `${yearRange.to}-12-31`;
    if (seasonRange) {
      params.start_date = seasonRange.start;
      params.end_date = seasonRange.end;
    }

    return params;
  }

  function getAllGenreIds(lite) {
    return [...(lite.genres || []), ...(lite.explicitGenres || [])]
      .map((genre) => String(genre?.mal_id || ""))
      .filter(Boolean);
  }

  function matchesClientFilters(lite) {
    if (!lite || isAdultAnime?.(lite)) return false;

    const genreIds = getAllGenreIds(lite);
    if (filters.genreMode === "and" && filters.includeGenres.length) {
      if (!filters.includeGenres.every((id) => genreIds.includes(id))) return false;
    }

    if (filters.excludeGenres.length && filters.excludeGenres.some((id) => genreIds.includes(id))) {
      return false;
    }

    const yearRange = getYearRange();
    if (lite.year && yearRange.from && lite.year < yearRange.from) return false;
    if (lite.year && yearRange.to && lite.year > yearRange.to) return false;

    if (filters.season && lite.season && String(lite.season).toLowerCase() !== filters.season) return false;
    if (filters.status === "cancelled" && !String(lite.status || "").toLowerCase().includes("cancel")) return false;

    if (filters.episodes && !matchesEpisodeRange(lite.episodes, filters.episodes)) return false;
    if (filters.popularity && !matchesPopularity(lite.members, filters.popularity)) return false;

    if (filters.studio && Array.isArray(lite.studios) && lite.studios.length) {
      const studioMatch = lite.studios.some((studio) => String(studio.mal_id || "") === filters.studio);
      if (!studioMatch) return false;
    }

    return true;
  }

  function matchesEpisodeRange(episodes, range) {
    const count = Number(episodes);
    if (!Number.isFinite(count) || count <= 0) return true;
    if (range === "1-12") return count >= 1 && count <= 12;
    if (range === "13-24") return count >= 13 && count <= 24;
    if (range === "25-52") return count >= 25 && count <= 52;
    if (range === "53+") return count >= 53;
    return true;
  }

  function matchesPopularity(members, range) {
    const count = Number(members);
    if (!Number.isFinite(count)) return true;
    if (range === "blockbuster") return count >= 500000;
    if (range === "mainstream") return count >= 120000;
    if (range === "niche") return count < 120000;
    if (range === "hidden") return count < 50000;
    return true;
  }

  function mergeItems(existing, incoming) {
    const map = new Map();
    existing.concat(incoming).forEach((anime) => {
      if (anime?.mal_id) map.set(Number(anime.mal_id), anime);
    });
    return Array.from(map.values());
  }

  function renderFilterView() {
    root = document.getElementById("filterRoot");
    if (!root) return;

    if (!initialized) {
      filters = queryHasFilters() ? readFiltersFromUrl() : createDefaultFilters();
      lastUrlSearch = location.search;
      root.innerHTML = renderShell();
      bindEvents();
      setupObserver();
      initialized = true;
      syncControls();
      loadResults({ reset: true });
      return;
    }

    if (location.search !== lastUrlSearch) {
      filters = readFiltersFromUrl();
      viewState = createDefaultViewState();
      syncControls();
      loadResults({ reset: true });
      return;
    }

    syncControls();
    if (!viewState.items.length && !viewState.loading) loadResults({ reset: true });
  }

  function renderShell() {
    return `
      <div class="fp-shell">
        <section class="fp-heroPanel" aria-labelledby="filterPageTitle">
          <div>
            <p class="fp-kicker">Discovery Center</p>
            <h1 class="fp-pageTitle" id="filterPageTitle">Advanced Anime Filter</h1>
            <p class="fp-heroText">Find anime by genre logic, studio, release window, score, popularity and watch length.</p>
          </div>
          <div class="fp-heroMetrics" aria-label="Filter capabilities">
            <span>Multi-select</span>
            <span>URL sync</span>
            <span>Infinite scroll</span>
          </div>
        </section>

        <div class="fp-toolbar">
          <div class="fp-toolbar__left">
            <button class="fp-filterBtn" type="button" data-open-filter-sheet>
              <span>Filters</span>
              <span class="fp-filterBtn__count" data-filter-count hidden>0</span>
            </button>
            <span class="fp-resultCount" data-result-count>Preparing discovery engine...</span>
          </div>
          <div class="fp-toolbar__right">
            <label class="fp-sortWrap" aria-label="Sort anime">
              <select class="fp-sortSelect" data-filter-field="sort">
                ${renderOptions(SORTS)}
              </select>
            </label>
          </div>
        </div>

        <div class="fp-activeFilters" data-active-filters aria-live="polite"></div>

        <div class="fp-layout">
          <aside class="fp-sidebar" aria-label="Anime filters">
            ${renderControls()}
          </aside>
          <main class="fp-results" aria-live="polite">
            <div class="fp-grid" data-results-grid></div>
            <div class="fp-loadMore" data-loading-more hidden>
              <span class="fp-spinner" aria-hidden="true"></span>
            </div>
            <button class="fp-empty__btn fp-loadMoreBtn" type="button" data-load-more hidden>Load more anime</button>
            <div data-filter-sentinel aria-hidden="true"></div>
          </main>
        </div>

        <div class="fp-sheet" data-filter-sheet>
          <div class="fp-sheet__backdrop" data-close-filter-sheet></div>
          <section class="fp-sheet__panel" role="dialog" aria-modal="true" aria-label="Filter anime">
            <div class="fp-sheet__handle"><span class="fp-sheet__handleBar"></span></div>
            <div class="fp-sheet__header">
              <div class="fp-sheet__title">Filters</div>
              <button class="fp-sheet__close" type="button" data-close-filter-sheet aria-label="Close filters">x</button>
            </div>
            ${renderControls()}
          </section>
        </div>
      </div>
    `;
  }

  function renderControls() {
    return `
      <div class="fp-search">
        <span class="fp-search__icon" aria-hidden="true">S</span>
        <input class="fp-search__input" type="search" autocomplete="off" placeholder="Search anime, studio, keyword..."
          data-filter-field="q" aria-label="Search anime" />
        <button class="fp-search__clear" type="button" data-clear-search aria-label="Clear search">x</button>
        <div class="fp-suggestions" data-search-suggestions hidden></div>
      </div>

      ${renderGroup("Genre logic", `
        <div class="fp-modeToggle" role="group" aria-label="Genre match logic">
          <button type="button" data-genre-logic="or">OR match</button>
          <button type="button" data-genre-logic="and">AND match</button>
        </div>
      `)}

      ${renderGroup("Include genres", `
        <div class="fp-chips">
          ${GENRES.map((genre) => renderGenreChip(genre, "include")).join("")}
        </div>
      `)}

      ${renderGroup("Exclude genres", `
        <div class="fp-chips">
          ${GENRES.map((genre) => renderGenreChip(genre, "exclude")).join("")}
        </div>
      `)}

      ${renderGroup("Release window", `
        <select class="fp-select" data-filter-field="yearPreset" aria-label="Year preset">
          ${renderOptions(YEAR_PRESETS)}
        </select>
        <div class="fp-yearRow">
          <input class="fp-input" type="number" inputmode="numeric" min="1940" max="${CURRENT_YEAR + 5}" placeholder="From"
            data-filter-field="yearFrom" aria-label="From year" />
          <input class="fp-input" type="number" inputmode="numeric" min="1940" max="${CURRENT_YEAR + 5}" placeholder="To"
            data-filter-field="yearTo" aria-label="To year" />
        </div>
        <div class="fp-chips fp-chips--compact">
          ${SEASONS.filter((season) => season.value).map((season) => renderValueChip(season, "season")).join("")}
        </div>
      `)}

      ${renderGroup("Format", `
        <div class="fp-chips">
          ${FORMATS.filter((format) => format.value).map((format) => renderValueChip(format, "format")).join("")}
        </div>
      `)}

      ${renderGroup("Status", `
        <div class="fp-chips">
          ${STATUSES.filter((status) => status.value).map((status) => renderValueChip(status, "status")).join("")}
        </div>
      `)}

      ${renderGroup("Studio and length", `
        <select class="fp-select" data-filter-field="studio" aria-label="Studio">
          ${renderOptions(STUDIOS)}
        </select>
        <select class="fp-select" data-filter-field="episodes" aria-label="Episode count">
          ${renderOptions(EPISODE_RANGES)}
        </select>
      `)}

      ${renderGroup("Score and popularity", `
        <div class="fp-slider">
          <div class="fp-slider__labels">
            <span>Minimum score</span>
            <span class="fp-slider__value" data-score-value>0</span>
          </div>
          <input class="fp-slider__input" type="range" min="0" max="10" step="0.5" data-filter-field="minScore" />
        </div>
        <select class="fp-select" data-filter-field="popularity" aria-label="Popularity">
          ${renderOptions(POPULARITY_RANGES)}
        </select>
      `)}

      ${renderGroup("Saved filters", `
        <div class="fp-presets" data-preset-list></div>
        <button class="fp-resetBtn fp-savePresetBtn" type="button" data-save-preset>Save preset</button>
      `)}

      <div class="fp-sidebarActions">
        <button class="fp-resetBtn" type="button" data-reset-filters>Reset</button>
        <button class="fp-applyBtn" type="button" data-apply-filters>Apply</button>
      </div>
    `;
  }

  function renderGroup(title, body) {
    return `
      <section class="fp-group">
        <div class="fp-group__header" data-collapse-group>
          <span class="fp-group__title">${escapeHtml(title)}</span>
          <span class="fp-group__chevron" aria-hidden="true">&gt;</span>
        </div>
        <div class="fp-group__body">${body}</div>
      </section>
    `;
  }

  function renderOptions(options) {
    return options
      .map((item) => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`)
      .join("");
  }

  function renderGenreChip(genre, mode) {
    return `
      <button class="fp-chip" type="button" data-genre-id="${escapeHtml(genre.id)}" data-genre-mode="${escapeHtml(mode)}">
        ${escapeHtml(genre.name)}
      </button>
    `;
  }

  function renderValueChip(item, field) {
    return `
      <button class="fp-chip" type="button" data-chip-field="${escapeHtml(field)}" data-chip-value="${escapeHtml(item.value)}">
        ${escapeHtml(item.label)}
      </button>
    `;
  }

  function bindEvents() {
    root.addEventListener("input", handleInput);
    root.addEventListener("change", handleChange);
    root.addEventListener("click", handleClick);
    root.addEventListener("keydown", handleKeydown);
    document.addEventListener("keydown", handleDocumentKeydown);
  }

  function setupObserver() {
    const sentinel = root.querySelector("[data-filter-sentinel]");
    if (!sentinel || typeof IntersectionObserver === "undefined") return;

    observer?.disconnect();
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || viewState.loading || !viewState.hasNext) return;
          loadResults({ reset: false });
        });
      },
      { root: null, rootMargin: "900px 0px", threshold: 0.01 },
    );
    observer.observe(sentinel);
  }

  function handleInput(event) {
    const field = event.target.closest("[data-filter-field]");
    if (!field) return;

    const key = field.getAttribute("data-filter-field");
    if (key === "q") {
      filters.q = String(field.value || "").slice(0, 90);
      syncSearchControls();
      renderActiveFilters();
      updateFilterCount();
      debouncedReload();
      return;
    }

    if (key === "minScore") {
      filters.minScore = clampNumber(field.value, 0, 10);
      syncControls();
      debouncedReload();
      return;
    }

    if (key === "yearFrom" || key === "yearTo") {
      filters[key] = normalizeYear(field.value) || String(field.value || "").slice(0, 4);
      filters.yearPreset = filters[key] ? "custom" : filters.yearPreset;
      syncControls();
      debouncedReload();
    }
  }

  function handleChange(event) {
    const field = event.target.closest("[data-filter-field]");
    if (!field) return;

    const key = field.getAttribute("data-filter-field");
    if (key === "sort") {
      filters.sort = valueFromList(SORTS, field.value) || "trending";
      syncControls();
      loadResults({ reset: true });
      return;
    }

    if (key === "yearPreset") {
      filters.yearPreset = valueFromList(YEAR_PRESETS, field.value);
      if (!filters.yearPreset) {
        filters.yearFrom = "";
        filters.yearTo = "";
      } else if (filters.yearPreset !== "custom") {
        const preset = YEAR_PRESETS.find((item) => item.value === filters.yearPreset);
        filters.yearFrom = preset?.from ? String(preset.from) : "";
        filters.yearTo = preset?.to ? String(preset.to) : "";
      }
      syncControls();
      loadResults({ reset: true });
      return;
    }

    if (Object.prototype.hasOwnProperty.call(filters, key)) {
      filters[key] = String(field.value || "");
      syncControls();
      loadResults({ reset: true });
    }
  }

  function handleClick(event) {
    const openSheet = event.target.closest("[data-open-filter-sheet]");
    if (openSheet) {
      setSheetOpen(true);
      return;
    }

    const closeSheet = event.target.closest("[data-close-filter-sheet]");
    if (closeSheet) {
      setSheetOpen(false);
      return;
    }

    const clearSearch = event.target.closest("[data-clear-search]");
    if (clearSearch) {
      filters.q = "";
      syncControls();
      loadResults({ reset: true });
      return;
    }

    const genreButton = event.target.closest("[data-genre-id]");
    if (genreButton) {
      toggleGenre(genreButton.getAttribute("data-genre-id"), genreButton.getAttribute("data-genre-mode"));
      return;
    }

    const logicButton = event.target.closest("[data-genre-logic]");
    if (logicButton) {
      filters.genreMode = logicButton.getAttribute("data-genre-logic") === "and" ? "and" : "or";
      syncControls();
      loadResults({ reset: true });
      return;
    }

    const valueChip = event.target.closest("[data-chip-field]");
    if (valueChip) {
      const field = valueChip.getAttribute("data-chip-field");
      const value = valueChip.getAttribute("data-chip-value") || "";
      filters[field] = filters[field] === value ? "" : value;
      syncControls();
      loadResults({ reset: true });
      return;
    }

    const clearFilter = event.target.closest("[data-clear-filter]");
    if (clearFilter) {
      clearFilterKey(clearFilter.getAttribute("data-clear-filter"), clearFilter.getAttribute("data-value"));
      return;
    }

    const resetButton = event.target.closest("[data-reset-filters]");
    if (resetButton) {
      filters = createDefaultFilters();
      syncControls();
      setSheetOpen(false);
      loadResults({ reset: true });
      return;
    }

    const applyButton = event.target.closest("[data-apply-filters]");
    if (applyButton) {
      setSheetOpen(false);
      loadResults({ reset: true });
      return;
    }

    const savePreset = event.target.closest("[data-save-preset]");
    if (savePreset) {
      saveCurrentPreset();
      return;
    }

    const applyPreset = event.target.closest("[data-apply-preset]");
    if (applyPreset) {
      applySavedPreset(applyPreset.getAttribute("data-apply-preset"));
      return;
    }

    const removePreset = event.target.closest("[data-remove-preset]");
    if (removePreset) {
      removeSavedPreset(removePreset.getAttribute("data-remove-preset"));
      return;
    }

    const suggestion = event.target.closest("[data-search-suggestion]");
    if (suggestion) {
      filters.q = suggestion.getAttribute("data-search-suggestion") || "";
      syncControls();
      loadResults({ reset: true });
      return;
    }

    const loadMore = event.target.closest("[data-load-more]");
    if (loadMore) {
      loadResults({ reset: false });
      return;
    }

    const favoriteButton = event.target.closest("[data-card-fav]");
    if (favoriteButton) {
      event.preventDefault();
      event.stopPropagation();
      const lite = findItemById(favoriteButton.getAttribute("data-card-fav"));
      if (lite) app.toggleFavorite?.(lite);
      return;
    }

    const bookmarkButton = event.target.closest("[data-bookmark-id]");
    if (bookmarkButton) {
      event.preventDefault();
      event.stopPropagation();
      toggleBookmark(bookmarkButton.getAttribute("data-bookmark-id"));
      return;
    }

    const openAnime = event.target.closest("[data-open-anime]");
    if (openAnime) {
      location.hash = `#/anime/${openAnime.getAttribute("data-open-anime")}`;
    }
  }

  function handleKeydown(event) {
    const openAnime = event.target.closest("[data-open-anime]");
    if (!openAnime) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    location.hash = `#/anime/${openAnime.getAttribute("data-open-anime")}`;
  }

  function handleDocumentKeydown(event) {
    if (event.key === "Escape") setSheetOpen(false);
  }

  function setSheetOpen(open) {
    const sheet = root?.querySelector("[data-filter-sheet]");
    if (!sheet) return;

    const backdrop = sheet.querySelector(".fp-sheet__backdrop");
    const panel = sheet.querySelector(".fp-sheet__panel");
    backdrop?.classList.toggle("is-visible", open);
    panel?.classList.toggle("is-open", open);
    document.body.classList.toggle("filter-sheet-open", open);
  }

  function toggleGenre(id, mode) {
    if (!GENRE_BY_ID.has(id)) return;
    const target = mode === "exclude" ? "excludeGenres" : "includeGenres";
    const opposite = mode === "exclude" ? "includeGenres" : "excludeGenres";

    if (filters[target].includes(id)) {
      filters[target] = filters[target].filter((item) => item !== id);
    } else {
      filters[target] = uniqueList(filters[target].concat(id));
      filters[opposite] = filters[opposite].filter((item) => item !== id);
    }

    syncControls();
    loadResults({ reset: true });
  }

  function clearFilterKey(key, value) {
    if (key === "q") filters.q = "";
    if (key === "includeGenres") filters.includeGenres = filters.includeGenres.filter((id) => id !== value);
    if (key === "excludeGenres") filters.excludeGenres = filters.excludeGenres.filter((id) => id !== value);
    if (key === "year") {
      filters.yearPreset = "";
      filters.yearFrom = "";
      filters.yearTo = "";
    }
    if (key === "season") filters.season = "";
    if (key === "format") filters.format = "";
    if (key === "status") filters.status = "";
    if (key === "studio") filters.studio = "";
    if (key === "episodes") filters.episodes = "";
    if (key === "minScore") filters.minScore = 0;
    if (key === "popularity") filters.popularity = "";
    if (key === "sort") filters.sort = "trending";

    syncControls();
    loadResults({ reset: true });
  }

  function syncControls() {
    if (!root) return;

    setFieldValue("q", filters.q);
    setFieldValue("sort", filters.sort);
    setFieldValue("yearPreset", filters.yearPreset);
    setFieldValue("yearFrom", filters.yearFrom);
    setFieldValue("yearTo", filters.yearTo);
    setFieldValue("studio", filters.studio);
    setFieldValue("episodes", filters.episodes);
    setFieldValue("minScore", filters.minScore);
    setFieldValue("popularity", filters.popularity);

    root.querySelectorAll("[data-genre-id]").forEach((button) => {
      const id = button.getAttribute("data-genre-id");
      const mode = button.getAttribute("data-genre-mode");
      const active = mode === "exclude" ? filters.excludeGenres.includes(id) : filters.includeGenres.includes(id);
      button.classList.toggle("is-active", active);
    });

    root.querySelectorAll("[data-genre-logic]").forEach((button) => {
      button.classList.toggle("is-active", button.getAttribute("data-genre-logic") === filters.genreMode);
    });

    root.querySelectorAll("[data-chip-field]").forEach((button) => {
      const field = button.getAttribute("data-chip-field");
      button.classList.toggle("is-active", filters[field] === button.getAttribute("data-chip-value"));
    });

    root.querySelectorAll("[data-score-value]").forEach((element) => {
      element.textContent = filters.minScore > 0 ? `${filters.minScore}+` : "Any";
    });

    syncSearchControls();
    renderActiveFilters();
    renderPresetLists();
    updateFilterCount();
    updateResultCount();
  }

  function setFieldValue(field, value) {
    root.querySelectorAll(`[data-filter-field="${field}"]`).forEach((element) => {
      if (element === document.activeElement) return;
      element.value = value ?? "";
    });
  }

  function syncSearchControls() {
    if (!root) return;
    root.querySelectorAll("[data-filter-field='q']").forEach((element) => {
      if (element !== document.activeElement) element.value = filters.q;
    });
    root.querySelectorAll("[data-clear-search]").forEach((button) => {
      button.style.display = filters.q ? "flex" : "";
    });
    renderSuggestions();
  }

  function renderSuggestions() {
    const recent = readJson(STORAGE_KEYS.recent, []).slice(0, 5);
    root.querySelectorAll("[data-search-suggestions]").forEach((box) => {
      if (!recent.length || filters.q.trim()) {
        box.hidden = true;
        box.innerHTML = "";
        return;
      }

      box.hidden = false;
      box.innerHTML = `
        <div class="fp-suggestions__title">Recent searches</div>
        ${recent.map((item) => `
          <button type="button" data-search-suggestion="${escapeHtml(item)}">${escapeHtml(item)}</button>
        `).join("")}
      `;
    });
  }

  function renderActiveFilters() {
    const host = root.querySelector("[data-active-filters]");
    if (!host) return;

    const tags = [];
    if (filters.q.trim()) tags.push(activeTag(`Search: ${filters.q.trim()}`, "q"));
    filters.includeGenres.forEach((id) => tags.push(activeTag(`Include: ${genreName(id)}`, "includeGenres", id)));
    filters.excludeGenres.forEach((id) => tags.push(activeTag(`Exclude: ${genreName(id)}`, "excludeGenres", id)));

    const yearLabel = getYearLabel();
    if (yearLabel) tags.push(activeTag(yearLabel, "year"));
    if (filters.season) tags.push(activeTag(labelFor(SEASONS, filters.season), "season"));
    if (filters.format) tags.push(activeTag(labelFor(FORMATS, filters.format), "format"));
    if (filters.status) tags.push(activeTag(labelFor(STATUSES, filters.status), "status"));
    if (filters.studio) tags.push(activeTag(labelFor(STUDIOS, filters.studio), "studio"));
    if (filters.episodes) tags.push(activeTag(labelFor(EPISODE_RANGES, filters.episodes), "episodes"));
    if (filters.minScore > 0) tags.push(activeTag(`Score ${filters.minScore}+`, "minScore"));
    if (filters.popularity) tags.push(activeTag(labelFor(POPULARITY_RANGES, filters.popularity), "popularity"));
    if (filters.sort !== "trending") tags.push(activeTag(`Sort: ${labelFor(SORTS, filters.sort)}`, "sort"));

    host.innerHTML = tags.length
      ? `${tags.join("")}<button class="fp-clearAll" type="button" data-reset-filters>Clear all</button>`
      : "";
  }

  function activeTag(label, key, value = "") {
    return `
      <button class="fp-activeTag" type="button" data-clear-filter="${escapeHtml(key)}" data-value="${escapeHtml(value)}">
        <span>${escapeHtml(label)}</span>
        <span class="fp-activeTag__x" aria-hidden="true">x</span>
      </button>
    `;
  }

  function getYearLabel() {
    if (filters.yearPreset && filters.yearPreset !== "custom") return labelFor(YEAR_PRESETS, filters.yearPreset);
    if (filters.yearFrom && filters.yearTo) return `${filters.yearFrom}-${filters.yearTo}`;
    if (filters.yearFrom) return `From ${filters.yearFrom}`;
    if (filters.yearTo) return `Until ${filters.yearTo}`;
    return "";
  }

  function genreName(id) {
    return GENRE_BY_ID.get(String(id))?.name || id;
  }

  function labelFor(list, value) {
    return list.find((item) => item.value === value)?.label || value;
  }

  function updateFilterCount() {
    const count = getActiveFilterCount();
    root.querySelectorAll("[data-filter-count]").forEach((element) => {
      element.hidden = count === 0;
      element.textContent = String(count);
    });
  }

  function getActiveFilterCount() {
    let count = 0;
    if (filters.q.trim()) count += 1;
    count += filters.includeGenres.length + filters.excludeGenres.length;
    if (getYearLabel()) count += 1;
    ["season", "format", "status", "studio", "episodes", "popularity"].forEach((key) => {
      if (filters[key]) count += 1;
    });
    if (filters.minScore > 0) count += 1;
    if (filters.sort !== "trending") count += 1;
    return count;
  }

  function updateResultCount() {
    const host = root?.querySelector("[data-result-count]");
    if (!host) return;

    if (viewState.loading && !viewState.items.length) {
      host.textContent = "Loading premium anime matches...";
      return;
    }

    if (viewState.error) {
      host.textContent = "Could not load results";
      return;
    }

    const loaded = viewState.items.length;
    if (viewState.total) {
      host.textContent = `${formatCompact(viewState.total)} results found, ${loaded} loaded`;
      return;
    }

    host.textContent = loaded ? `${loaded} anime loaded` : "No filters active";
  }

  function formatCompact(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
    if (number >= 1000) return `${Math.round(number / 1000)}K`;
    return String(number);
  }

  function renderPresetLists() {
    const presets = readJson(STORAGE_KEYS.presets, []);
    root.querySelectorAll("[data-preset-list]").forEach((host) => {
      if (!presets.length) {
        host.innerHTML = '<div class="fp-presets__empty">No saved presets yet.</div>';
        return;
      }

      host.innerHTML = presets.map((preset) => `
        <div class="fp-presetChip">
          <button type="button" data-apply-preset="${escapeHtml(preset.id)}">${escapeHtml(preset.name)}</button>
          <button type="button" data-remove-preset="${escapeHtml(preset.id)}" aria-label="Remove ${escapeHtml(preset.name)}">x</button>
        </div>
      `).join("");
    });
  }

  async function loadResults({ reset = false } = {}) {
    if (!fetchAnime) return;
    if (viewState.loading && !reset) return;

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
      writeFiltersToUrl();

      const data = await fetchAnime("/anime", buildApiParams(), {
        cacheTtlMs: 90_000,
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

      if (filters.q.trim()) rememberSearch(filters.q.trim());
      renderResults();
    } catch (error) {
      if (error?.name === "AbortError") return;
      viewState.error = error?.message || "Could not load anime results.";
      renderError(viewState.error);
    } finally {
      if (seq === requestSeq) {
        viewState.loading = false;
        setLoadingMore(false);
        updateResultCount();
      }
    }
  }

  function renderSkeletons() {
    const grid = root.querySelector("[data-results-grid]");
    if (!grid) return;

    grid.innerHTML = Array.from({ length: 12 }).map(() => `
      <article class="fp-skeleton">
        <div class="fp-skeleton__media"></div>
        <div class="fp-skeleton__body">
          <div class="fp-skeleton__line"></div>
          <div class="fp-skeleton__line fp-skeleton__line--sm"></div>
          <div class="fp-skeleton__line fp-skeleton__line--xs"></div>
        </div>
      </article>
    `).join("");
  }

  function renderResults() {
    const grid = root.querySelector("[data-results-grid]");
    if (!grid) return;

    if (!viewState.items.length) {
      grid.innerHTML = `
        <div class="fp-empty">
          <div class="fp-empty__icon">No results</div>
          <div class="fp-empty__title">No results found</div>
          <div class="fp-empty__text">Try removing one filter, switching genre logic to OR, or lowering the score threshold.</div>
          <button class="fp-empty__btn" type="button" data-reset-filters>Reset filters</button>
        </div>
      `;
      updateLoadMoreButton();
      return;
    }

    grid.innerHTML = viewState.items.map(renderAnimeCard).join("");
    app.refreshFavButtons?.();
    refreshBookmarkButtons();
    updateLoadMoreButton();
  }

  function renderError(message) {
    const grid = root.querySelector("[data-results-grid]");
    if (!grid) return;

    grid.innerHTML = `
      <div class="fp-empty fp-error">
        <div class="fp-empty__icon">Error</div>
        <div class="fp-empty__title">Anime results did not load</div>
        <div class="fp-empty__text">${escapeHtml(message)}</div>
        <button class="fp-empty__btn" type="button" data-apply-filters>Try again</button>
      </div>
    `;
    updateLoadMoreButton();
  }

  function renderAnimeCard(lite, index) {
    const genres = (lite.genres || []).slice(0, 3);
    const altTitle = lite.titleEnglish && lite.titleEnglish !== lite.title
      ? lite.titleEnglish
      : lite.titleJapanese || "";
    const studio = lite.studios?.[0]?.name || "";
    const statusClass = getStatusClass(lite.status);
    const bookmarked = getBookmarks().includes(String(lite.mal_id));

    return `
      <article class="fp-card" data-open-anime="${escapeHtml(lite.mal_id)}" tabindex="0" role="button"
        aria-label="Open ${escapeHtml(lite.title)} details" style="animation-delay:${Math.min(index * 0.018, 0.24)}s">
        <div class="fp-card__media">
          <img class="fp-card__img" src="${escapeHtml(lite.image || CARD_FALLBACK_POSTER)}" alt="${escapeHtml(lite.title)} poster"
            loading="lazy" decoding="async" onerror="this.src='${CARD_FALLBACK_POSTER}'" />
          ${lite.type ? `<span class="fp-card__badge fp-card__badge--type">${escapeHtml(lite.type)}</span>` : ""}
          <span class="fp-card__scoreBadge">Score ${escapeHtml(formatScore(lite.score))}</span>
          ${lite.status ? `<span class="fp-card__badge fp-card__badge--status ${statusClass}">${escapeHtml(shortStatus(lite.status))}</span>` : ""}
          <div class="fp-card__overlay">
            <div class="fp-card__overlayGenres">
              ${genres.map((genre) => `<span class="fp-card__overlayGenre">${escapeHtml(genre.name)}</span>`).join("")}
            </div>
            <div class="fp-card__overlayActions">
              <a class="fp-card__actionBtn fp-card__watchBtn" href="#/anime/${escapeHtml(lite.mal_id)}">Watch</a>
              <button class="fp-card__actionBtn fp-card__favBtn" type="button" data-fav-btn="true"
                data-card-fav="${escapeHtml(lite.mal_id)}" data-id="${escapeHtml(lite.mal_id)}" aria-label="Toggle favorite">Fav</button>
              <button class="fp-card__actionBtn fp-card__favBtn fp-bookmarkBtn ${bookmarked ? "is-on" : ""}" type="button"
                data-bookmark-id="${escapeHtml(lite.mal_id)}" aria-label="Toggle bookmark">Save</button>
            </div>
          </div>
        </div>
        <div class="fp-card__body">
          <h3 class="fp-card__title">${escapeHtml(lite.title)}</h3>
          ${altTitle ? `<p class="fp-card__alt">${escapeHtml(altTitle)}</p>` : ""}
          ${studio ? `<p class="fp-card__studio">${escapeHtml(studio)}</p>` : ""}
          <div class="fp-card__meta">
            <span class="fp-card__year">${escapeHtml(lite.year || "TBA")}</span>
            <span class="fp-card__dot"></span>
            <span class="fp-card__eps">${escapeHtml(lite.episodes ? `${lite.episodes} eps` : "Episodes TBA")}</span>
          </div>
        </div>
      </article>
    `;
  }

  function getStatusClass(status) {
    const normalized = String(status || "").toLowerCase();
    if (normalized.includes("airing")) return "fp-card__badge--airing";
    if (normalized.includes("not yet")) return "fp-card__badge--upcoming";
    return "fp-card__badge--complete";
  }

  function shortStatus(status) {
    const normalized = String(status || "");
    if (normalized.toLowerCase().includes("finished")) return "Finished";
    if (normalized.toLowerCase().includes("airing")) return "Releasing";
    if (normalized.toLowerCase().includes("not yet")) return "Upcoming";
    return normalized.replace(/_/g, " ");
  }

  function setLoadingMore(active) {
    const spinner = root?.querySelector("[data-loading-more]");
    if (spinner) spinner.hidden = !active || !viewState.items.length;
    updateLoadMoreButton();
  }

  function updateLoadMoreButton() {
    const button = root?.querySelector("[data-load-more]");
    if (!button) return;
    button.hidden = !viewState.hasNext || viewState.loading || !viewState.items.length;
  }

  function findItemById(id) {
    const numericId = Number(id);
    return viewState.items.find((item) => Number(item.mal_id) === numericId);
  }

  function rememberSearch(query) {
    const normalized = String(query || "").trim();
    if (normalized.length < 2) return;
    const recent = readJson(STORAGE_KEYS.recent, []);
    writeJson(STORAGE_KEYS.recent, uniqueList([normalized].concat(recent)).slice(0, 8));
  }

  function saveCurrentPreset() {
    const name = window.prompt("Preset name", buildPresetName());
    const cleanName = String(name || "").trim().slice(0, 32);
    if (!cleanName) return;

    const presets = readJson(STORAGE_KEYS.presets, []);
    const nextPreset = {
      id: String(Date.now()),
      name: cleanName,
      filters: cloneFilters(filters),
    };

    writeJson(STORAGE_KEYS.presets, [nextPreset].concat(presets).slice(0, 8));
    renderPresetLists();
    toast?.("Preset saved", cleanName, "ok");
  }

  function buildPresetName() {
    if (filters.q.trim()) return filters.q.trim();
    if (filters.includeGenres.length) return filters.includeGenres.map(genreName).slice(0, 2).join(" + ");
    return "Anime filter";
  }

  function cloneFilters(source) {
    return {
      ...createDefaultFilters(),
      ...source,
      includeGenres: source.includeGenres ? source.includeGenres.slice() : [],
      excludeGenres: source.excludeGenres ? source.excludeGenres.slice() : [],
    };
  }

  function applySavedPreset(id) {
    const presets = readJson(STORAGE_KEYS.presets, []);
    const preset = presets.find((item) => item.id === id);
    if (!preset?.filters) return;
    filters = cloneFilters(preset.filters);
    syncControls();
    setSheetOpen(false);
    loadResults({ reset: true });
  }

  function removeSavedPreset(id) {
    const presets = readJson(STORAGE_KEYS.presets, []);
    writeJson(STORAGE_KEYS.presets, presets.filter((item) => item.id !== id));
    renderPresetLists();
  }

  function getBookmarks() {
    return uniqueList(readJson(STORAGE_KEYS.bookmarks, []));
  }

  function toggleBookmark(id) {
    const normalized = String(id || "");
    if (!normalized) return;
    const bookmarks = getBookmarks();
    const next = bookmarks.includes(normalized)
      ? bookmarks.filter((item) => item !== normalized)
      : [normalized].concat(bookmarks).slice(0, 80);
    writeJson(STORAGE_KEYS.bookmarks, next);
    refreshBookmarkButtons();
    toast?.(next.includes(normalized) ? "Bookmarked" : "Bookmark removed", "", next.includes(normalized) ? "ok" : "warn");
  }

  function refreshBookmarkButtons() {
    const bookmarks = getBookmarks();
    root?.querySelectorAll("[data-bookmark-id]").forEach((button) => {
      const active = bookmarks.includes(String(button.getAttribute("data-bookmark-id") || ""));
      button.classList.toggle("is-on", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.textContent = active ? "Saved" : "Save";
    });
  }

  app.renderFilterView = renderFilterView;
})();
