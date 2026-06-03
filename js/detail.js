/* AnimeFlix anime detail route */
(function () {
  "use strict";

  const app = window.AnimeFlix;
  if (!app) return;

  const {
    fetchAnime,
    animeToLite,
    isAdultAnime,
    sanitizeText,
    formatScore,
    state,
    controllers,
    toast,
  } = app;

  const DEMO_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  const FALLBACK_POSTER =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 600'%3E%3Crect width='420' height='600' fill='%231a1a2e'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%239ca3af' font-family='Arial' font-size='24' dy='.3em'%3ENo Poster%3C/text%3E%3C/svg%3E";

  let detailSeq = 0;
  let activeEpisode = 1;

  function $(id) {
    return document.getElementById(id);
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

  async function loadAnimeDetails(id) {
    const animeId = Number(id);
    if (!Number.isFinite(animeId) || animeId <= 0) {
      renderDetailError("Anime ID noto'g'ri.");
      return;
    }

    detailSeq += 1;
    const seq = detailSeq;
    activeEpisode = 1;

    app.destroyActivePlayer?.();
    setDetailLoading();

    try {
      controllers.details?.abort?.();
      controllers.details = new AbortController();

      const data = await fetchAnime(`/anime/${animeId}`, { sfw: true }, {
        cacheTtlMs: 60_000,
        signal: controllers.details.signal,
      });

      if (seq !== detailSeq) return;

      const lite = animeToLite(data?.data);
      if (!lite?.mal_id || isAdultAnime?.(lite)) {
        renderDetailError("Bu anime SFW rejimida ko'rsatilmaydi.");
        return;
      }

      state.activeAnime = lite;
      renderDetailHero(lite);
      renderEpisodeList(lite);
      await renderVideoSource(lite, data?.data, seq);
      loadSimilarAnime(lite.mal_id, seq);
      const favBtn = document.getElementById("detailsFavBtn");
      if (favBtn) {
        const isFav = app.storage?.isFavorite(lite.mal_id);
        favBtn.textContent = isFav ? "Sevimlilardan olib tashlash" : "Add to favorites";
        favBtn.onclick = () => {
          const added = app.storage?.toggleFavorite(lite);
          favBtn.textContent = added ? "Sevimlilardan olib tashlash" : "Add to favorites";
          app.toast?.(added ? "Qo'shildi" : "Olib tashlandi", added ? "Sevimlilarga qo'shildi" : "Sevimlilardan olib tashlandi");
        };
      }
      if (app.storage?.addHistory) app.storage.addHistory(lite, activeEpisode);
    } catch (error) {
      if (error?.name === "AbortError") return;
      renderDetailError(error?.message || "Anime tafsilotlari yuklanmadi.");
      toast?.("Details error", error?.message || "Anime tafsilotlari yuklanmadi.", "error", 2600);
    }
  }

  function setDetailLoading() {
    $("detailsTitle").textContent = "Loading...";
    $("detailsScore").textContent = "★ --";
    $("detailsEpisodes").textContent = "Episodes: --";
    $("detailsStatus").textContent = "Status: --";
    $("detailsStudio").textContent = "Studio: --";
    $("detailsSynopsis").textContent = "";
    $("detailsGenres").replaceChildren();
    $("detailsImage").removeAttribute("src");
    $("detailsImage").onerror = null;
    $("detailsFavBtn").disabled = true;
    $("detailsMalLink").href = "#";
    $("episodeNow").textContent = "Hozir ijro etilmoqda: Epizod 1";
    $("episodeList").innerHTML = "";
    $("detailsCover").style.backgroundImage = "";
    $("detailVideoHost").innerHTML = '<div class="detailVideoSkeleton"></div>';
    $("recsMeta").textContent = "Yuklanmoqda...";
    $("recsGrid").replaceChildren();
    app.renderAnime?.($("recsGrid"), [], { skeletonCount: 6, layout: "grid" });
  }

  function renderDetailHero(lite) {
    const image = lite.image || FALLBACK_POSTER;
    const studio = lite.studios?.[0]?.name || "Unknown";
    const synopsis = sanitizeText(lite.synopsis) || "Tavsif mavjud emas.";

    $("detailsTitle").textContent = lite.title;
    $("detailsScore").textContent = `★ ${formatScore(lite.score)}`;
    $("detailsEpisodes").textContent = `Episodes: ${lite.episodes ?? "--"}`;
    $("detailsStatus").textContent = `Status: ${lite.status || "--"}`;
    $("detailsStudio").textContent = `Studio: ${studio}`;
    $("detailsSynopsis").textContent = synopsis;
    $("detailsImage").src = image;
    $("detailsImage").onerror = () => {
      $("detailsImage").src = FALLBACK_POSTER;
    };
    $("detailsCover").style.backgroundImage = `url("${image}")`;
    $("detailsFavBtn").disabled = false;
    $("detailsMalLink").href = lite.url || "#";

    const genresHost = $("detailsGenres");
    genresHost.replaceChildren();
    (lite.genres || []).forEach((genre) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = genre.name;
      genresHost.appendChild(chip);
    });
  }

  async function renderVideoSource(lite, rawAnime, seq) {
    const host = $("detailVideoHost");
    host.innerHTML = '<div class="detailVideoSkeleton"></div>';

    try {
      const videos = await fetchAnime(`/anime/${lite.mal_id}/videos`, {}, { cacheTtlMs: 60 * 60 * 1000 });
      if (seq !== detailSeq) return;
      const youtubeId = getPromoYoutubeId(videos?.data?.promo) || getYoutubeIdFromTrailer(rawAnime?.trailer);
      if (youtubeId) {
        renderYoutubeEmbed(host, youtubeId, lite.title);
        return;
      }
    } catch {
      if (seq !== detailSeq) return;
    }

    renderMp4Player(host, lite);
  }

  function getPromoYoutubeId(promo) {
    if (!Array.isArray(promo)) return "";
    for (const item of promo) {
      const id = getYoutubeIdFromTrailer(item?.trailer);
      if (id) return id;
    }
    return "";
  }

  function getYoutubeIdFromTrailer(trailer) {
    if (!trailer) return "";
    if (trailer.youtube_id) return String(trailer.youtube_id);
    return extractYoutubeId(trailer.embed_url || trailer.url || "");
  }

  function extractYoutubeId(url) {
    const value = String(url || "");
    const match = value.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    return match ? match[1] : "";
  }

  function renderYoutubeEmbed(host, youtubeId, title) {
    app.destroyActivePlayer?.();
    host.innerHTML = `
      <div class="youtubePlayer">
        <iframe
          src="https://www.youtube.com/embed/${escapeHtml(youtubeId)}?rel=0&modestbranding=1"
          title="${escapeHtml(title)} trailer"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </div>
    `;
  }

  function renderMp4Player(host, lite) {
    app.mountHtml5Player?.(host, {
      src: DEMO_VIDEO,
      poster: lite.image || "",
      title: lite.title,
    });
  }

  function renderEpisodeList(lite) {
    const list = $("episodeList");
    const episodeCount = getEpisodeCount(lite.episodes);
    const fragment = document.createDocumentFragment();

    for (let index = 1; index <= episodeCount; index += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "episodeButton";
      button.dataset.episode = String(index);
      button.textContent = `Epizod ${index}`;
      if (index === activeEpisode) button.classList.add("is-active");
      fragment.appendChild(button);
    }

    list.replaceChildren(fragment);
    updateEpisodeLabel();
    list.onclick = async (event) => {
      const button = event.target.closest("[data-episode]");
      if (!button) return;
      activeEpisode = Number(button.getAttribute("data-episode")) || 1;
      list.querySelectorAll("[data-episode]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      updateEpisodeLabel();
      if (app.storage?.addHistory) app.storage.addHistory(lite, activeEpisode);
      if (app.storage?.addContinueWatching) app.storage.addContinueWatching(lite, activeEpisode, 10);
    };
  }

  function getEpisodeCount(episodes) {
    const count = Number(episodes);
    if (!Number.isFinite(count) || count <= 0) return 12;
    return Math.max(1, Math.round(count));
  }

  function updateEpisodeLabel() {
    $("episodeNow").textContent = `Hozir ijro etilmoqda: Epizod ${activeEpisode}`;
  }

  async function loadSimilarAnime(id, seq) {
    const grid = $("recsGrid");
    const meta = $("recsMeta");

    try {
      const data = await fetchAnime(`/anime/${id}/recommendations`, { sfw: true }, { cacheTtlMs: 60_000 });
      if (seq !== detailSeq) return;
      const list = (data?.data || [])
        .map((item) => item?.entry)
        .filter(Boolean)
        .map(animeToLite)
        .filter((anime) => anime?.mal_id && !isAdultAnime?.(anime))
        .slice(0, 12);

      grid.replaceChildren();
      if (!list.length) {
        meta.textContent = "Tavsiyalar topilmadi";
        grid.innerHTML = '<div class="empty"><div class="empty__title">Tavsiyalar topilmadi</div></div>';
        return;
      }

      meta.textContent = `${list.length} anime`;
      app.renderAnime?.(grid, list, { layout: "grid" });
    } catch {
      if (seq !== detailSeq) return;
      meta.textContent = "Tavsiyalar yuklanmadi";
      grid.replaceChildren();
    }
  }

  function renderDetailError(message) {
    app.destroyActivePlayer?.();
    $("detailsTitle").textContent = "Could not load details";
    $("detailsScore").textContent = "★ --";
    $("detailsEpisodes").textContent = "Episodes: --";
    $("detailsStatus").textContent = "Status: --";
    $("detailsStudio").textContent = "Studio: --";
    $("detailsSynopsis").textContent = sanitizeText(message);
    $("detailsGenres").replaceChildren();
    $("detailVideoHost").innerHTML = "";
    $("episodeList").innerHTML = "";
    $("recsMeta").textContent = "";
    $("recsGrid").replaceChildren();
  }

  function stopAnimeDetails() {
    app.destroyActivePlayer?.();
    const host = $("detailVideoHost");
    if (host) host.replaceChildren();
  }

  app.loadAnimeDetails = loadAnimeDetails;
  app.stopAnimeDetails = stopAnimeDetails;
})();
