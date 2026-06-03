/* Favorites Manager */
(function() {
  "use strict";

  const app = window.AnimeFlix;
  if (!app) return;

  function renderFavoritesPage() {
    const user = app.storage.getUser();
    if (!user) {
      window.location.hash = '#/login';
      return;
    }

    const favorites = user.favorites || [];
    const grid = document.getElementById('favoritesGrid');
    const empty = document.getElementById('favoritesEmptyPage');

    if (favorites.length === 0) {
      grid.innerHTML = '';
      empty.hidden = false;
      return;
    }

    empty.hidden = true;
    grid.innerHTML = favorites.map(f => `
      <article class="card">
        <a href="#/anime/${f.mal_id}" class="card__poster">
          <img src="${f.image}" alt="${f.title}" />
          <div class="card__overlay">
            <button class="btn btn--secondary card__favBtn is-active" data-id="${f.mal_id}">Olib tashlash</button>
          </div>
          <span class="card__rating">★ ${app.formatScore(f.score)}</span>
        </a>
        <div class="card__body">
          <h3 class="card__title">${f.title}</h3>
          <div class="card__meta">
            <span>${f.episodes || '?'} ep</span>
            <span>${f.type || 'TV'}</span>
          </div>
        </div>
      </article>
    `).join('');

    // Attach events
    grid.querySelectorAll('.card__favBtn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const isAdded = app.storage.toggleFavorite({ mal_id: Number(id) });
        if (!isAdded) {
          app.toast('O\'chirildi', 'Sevimlilardan olib tashlandi');
          renderFavoritesPage(); // re-render
        }
      });
    });
  }

  app.renderFavoritesPage = renderFavoritesPage;

  document.getElementById('clearFavoritesBtn')?.addEventListener('click', () => {
    const user = app.storage.getUser();
    if (user && confirm('Barcha sevimlilarni o\'chirasizmi?')) {
      user.favorites = [];
      app.storage.saveUser(user);
      renderFavoritesPage();
      app.toast('Tozalandi', 'Barcha sevimlilar o\'chirildi');
    }
  });

})();
