/* Router Manager */
(function() {
  "use strict";

  const app = window.AnimeFlix || {};
  window.AnimeFlix = app;

  const routes = [
    { path: /^#\/$/, view: 'home', title: 'AnimeFlix' },
    { path: /^#\/filter/, view: 'filter', title: 'Browse — AnimeFlix' },
    { path: /^#\/favorites$/, view: 'favorites', title: 'Favorites — AnimeFlix', requiresAuth: true },
    { path: /^#\/anime\/(\d+)$/, view: 'details', title: 'Anime Details — AnimeFlix' },
    { path: /^#\/login$/, view: 'login', title: 'Login — AnimeFlix' },
    { path: /^#\/register$/, view: 'register', title: 'Register — AnimeFlix' },
    { path: /^#\/profile$/, view: 'profile', title: 'Profile — AnimeFlix', requiresAuth: true },
    { path: /^#\/profile\/settings$/, view: 'profileSettings', title: 'Settings — AnimeFlix', requiresAuth: true },
    { path: /^#\/profile\/continue$/, view: 'profileContinue', title: 'Continue Watching — AnimeFlix', requiresAuth: true },
    { path: /^#\/profile\/history$/, view: 'profileHistory', title: 'Watch History — AnimeFlix', requiresAuth: true },
  ];

  let currentView = '';

  function initRouter() {
    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('load', handleRoute);
  }

  function handleRoute() {
    const hash = window.location.hash || '#/';
    let matchedRoute = null;
    let params = null;

    for (const route of routes) {
      const match = hash.match(route.path);
      if (match) {
        matchedRoute = route;
        params = match.slice(1);
        break;
      }
    }

    if (!matchedRoute) {
      renderView('notfound', '404 Not Found — AnimeFlix');
      return;
    }

    // Check Auth
    if (matchedRoute.requiresAuth) {
      const user = app.storage?.getUser();
      if (!user || !user.username) {
        window.location.hash = '#/login';
        return;
      }
    }

    // If user is already logged in, skip login/register
    if ((matchedRoute.view === 'login' || matchedRoute.view === 'register') && app.storage?.getUser()?.username) {
      window.history.back();
      return;
    }

    document.title = matchedRoute.title;
    renderView(matchedRoute.view, matchedRoute.title, params, hash);
  }

  function renderView(viewId, title, params = [], hash) {
    if (currentView === viewId) return; // Ignore if same view, except if params change (handled later if needed)

    // Hide all views
    document.querySelectorAll('main > section').forEach(sec => {
      sec.hidden = true;
      sec.classList.remove('view-enter');
    });
    
    // Also hide the profile page if it's not a profile view
    const profilePageRoot = document.getElementById('viewProfile');
    if (profilePageRoot) profilePageRoot.hidden = true;

    const activeSection = document.querySelector(`main > section[data-view="${viewId}"]`) || document.getElementById('viewProfile');

    if (activeSection) {
      activeSection.hidden = false;
      
      // Trigger animation
      requestAnimationFrame(() => {
        activeSection.classList.add('view-enter');
      });
    }

    // Custom view handlers
    if (viewId === 'home') {
      if (app.loadHero) app.loadHero();
      if (app.loadHomeSections) app.loadHomeSections();
    } else if (viewId === 'filter') {
      if (app.renderFilterView) app.renderFilterView();
    } else if (viewId === 'favorites') {
      if (app.renderFavoritesPage) app.renderFavoritesPage();
    } else if (viewId === 'details') {
      if (app.loadAnimeDetails) app.loadAnimeDetails(params[0]);
    } else if (viewId.startsWith('profile')) {
      if (app.renderProfilePage) app.renderProfilePage(viewId);
    }

    updateNavbarActive(hash);
    currentView = viewId;
  }

  function updateNavbarActive(hash) {
    document.querySelectorAll('.nav__link').forEach(link => {
      link.classList.remove('is-active');
      if (link.getAttribute('href') === hash || (hash.startsWith('#/anime') && link.getAttribute('href') === '#/')) {
         // Custom logic if needed
      }
    });

    if (hash === '#/') document.getElementById('navHome')?.classList.add('is-active');
    else if (hash.startsWith('#/filter')) document.getElementById('navFilter')?.classList.add('is-active');
    else if (hash === '#/favorites') document.getElementById('navFavorites')?.classList.add('is-active');
  }

  app.router = {
    init: initRouter,
    navigate: (hash) => { window.location.hash = hash; }
  };

})();
