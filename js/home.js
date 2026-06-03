/* Home Page Manager */
(function() {
  "use strict";

  const app = window.AnimeFlix;
  if (!app) return;

  async function loadHero() {
    try {
      const data = await app.api.fetch('/anime', { order_by: 'popularity', sort: 'asc', limit: 1 });
      const anime = data.data?.[0];
      if (!anime) return;

      const title = anime.title_english || anime.title;
      const synopsis = anime.synopsis ? anime.synopsis.split('. ')[0] + '.' : 'No synopsis available.';
      const score = app.formatScore(anime.score);
      const eps = anime.episodes || '--';
      const imgUrl = anime.images?.jpg?.large_image_url;

      document.getElementById('heroTitle').textContent = title;
      document.getElementById('heroSynopsis').textContent = synopsis;
      document.getElementById('heroScore').textContent = `★ ${score}`;
      document.getElementById('heroEpisodes').textContent = `Episodes: ${eps}`;
      document.getElementById('heroImage').src = imgUrl;
      document.getElementById('heroBgImage').src = imgUrl;

      document.getElementById('heroDetailsBtn').onclick = () => {
        window.location.hash = `#/anime/${anime.mal_id}`;
      };

      const favBtn = document.getElementById('heroFavBtn');
      const isFav = app.storage.isFavorite(anime.mal_id);
      favBtn.textContent = isFav ? 'Sevimlilardan olib tashlash' : 'Add to favorites';
      favBtn.onclick = () => {
        const user = app.storage.getUser();
        if (!user) {
          window.location.hash = '#/login';
          return;
        }
        const added = app.storage.toggleFavorite(anime);
        favBtn.textContent = added ? 'Sevimlilardan olib tashlash' : 'Add to favorites';
        app.toast(added ? 'Qo\'shildi' : 'Olib tashlandi', added ? 'Sevimlilarga qo\'shildi' : 'Sevimlilardan olib tashlandi');
      };

    } catch (err) {
      console.error('Failed to load hero anime:', err);
    }
  }

  async function loadHomeSections() {
    // We expect sections with IDs: trendingGrid, topRatedGrid, popularGrid
    // Create them if they don't exist in the HTML structure
    ensureHomeStructure();

    loadGrid('/top/anime', { filter: 'airing', limit: 12 }, 'trendingGrid');
    loadGrid('/top/anime', { filter: 'bypopularity', limit: 12 }, 'topRatedGrid');
    loadGrid('/anime', { order_by: 'members', sort: 'desc', limit: 12 }, 'popularGrid');
  }

  function ensureHomeStructure() {
    const viewHome = document.getElementById('viewHome');
    if (!document.getElementById('trendingSection')) {
      const mainContent = document.createElement('div');
      mainContent.className = 'container';
      mainContent.innerHTML = `
        <section id="trendingSection" class="section">
          <h2 class="section__title">Trending Now</h2>
          <div class="grid" id="trendingGrid">${renderSkeletons(12)}</div>
        </section>
        <section id="topRatedSection" class="section">
          <h2 class="section__title">Top Rated</h2>
          <div class="grid" id="topRatedGrid">${renderSkeletons(12)}</div>
        </section>
        <section id="popularSection" class="section">
          <h2 class="section__title">Most Popular</h2>
          <div class="grid" id="popularGrid">${renderSkeletons(12)}</div>
        </section>
      `;
      viewHome.appendChild(mainContent);
    }
  }

  function renderSkeletons(count) {
    return Array(count).fill(0).map(() => `
      <article class="skeleton" style="height: 300px; border-radius: var(--radius);"></article>
    `).join('');
  }

  async function loadGrid(endpoint, params, gridId) {
    try {
      const data = await app.api.fetch(endpoint, params);
      const list = data.data || [];
      const grid = document.getElementById(gridId);
      
      if (!list.length) {
        grid.innerHTML = '<p>No data found.</p>';
        return;
      }

      grid.innerHTML = list.map(anime => {
        const title = anime.title_english || anime.title;
        const score = app.formatScore(anime.score);
        return `
          <article class="card">
            <a href="#/anime/${anime.mal_id}" class="card__poster">
              <img src="${anime.images?.jpg?.image_url}" alt="${title}" loading="lazy" />
              <div class="card__overlay">
                <button class="btn btn--primary">Tomosha qilish</button>
              </div>
              <span class="card__rating">★ ${score}</span>
            </a>
            <div class="card__body">
              <h3 class="card__title">${title}</h3>
              <div class="card__meta">
                <span>${anime.episodes || '?'} ep</span>
                <span>${anime.type || 'TV'}</span>
              </div>
            </div>
          </article>
        `;
      }).join('');

    } catch (err) {
      console.error('Failed to load grid', gridId, err);
      document.getElementById(gridId).innerHTML = '<div class="empty">Xatolik yuz berdi. Qayta urinib ko\'ring.</div>';
    }
  }

  // Search feature with dropdown
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    const dropdown = document.createElement('div');
    dropdown.className = 'search-dropdown';
    dropdown.hidden = true;
    searchInput.parentNode.appendChild(dropdown);

    const doSearch = app.debounce(async (query) => {
      if (!query) {
        dropdown.hidden = true;
        return;
      }
      try {
        const res = await app.api.fetch('/anime', { q: query, limit: 5 });
        const items = res.data || [];
        if (items.length === 0) {
          dropdown.innerHTML = '<div style="padding: 1rem; color: var(--color-text-muted);">Hech narsa topilmadi</div>';
        } else {
          dropdown.innerHTML = items.map(a => `
            <a href="#/anime/${a.mal_id}" class="search-dropdown-item" style="display:flex; gap:1rem; padding: 0.5rem; text-decoration:none; color:inherit; align-items:center;">
              <img src="${a.images?.jpg?.small_image_url}" style="width:40px; height:56px; object-fit:cover; border-radius:4px;">
              <div>
                <div style="font-weight:600;">${a.title}</div>
                <div style="font-size:0.75rem; color:var(--color-text-muted);">★ ${a.score} • ${a.type}</div>
              </div>
            </a>
          `).join('');
        }
        dropdown.hidden = false;
      } catch (err) {
        console.error('Search error', err);
      }
    }, 500);

    searchInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      doSearch(val);
    });

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.hidden = true;
      }
    });

    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim() && dropdown.innerHTML) {
        dropdown.hidden = false;
      }
    });
  }

  app.loadHero = loadHero;
  app.loadHomeSections = loadHomeSections;

})();
