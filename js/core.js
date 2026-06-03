/* Core init */
(function() {
  "use strict";

  const app = window.AnimeFlix || {};
  window.AnimeFlix = app;

  function init() {
    // 1. Storage
    if (app.storage?.init) app.storage.init();
    
    // 2. Auth
    if (app.auth?.init) app.auth.init();

    // 3. Router
    if (app.router?.init) app.router.init();

    // 4. Hamburger Menu
    initMobileMenu();

    // 5. Theme Toggle
    initThemeToggle();
  }

  function initMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const nav = document.getElementById('primaryNav');
    if (btn && nav) {
      btn.addEventListener('click', () => {
        nav.classList.toggle('is-open');
      });

      // Close when clicking outside
      document.addEventListener('click', (e) => {
        if (!nav.contains(e.target) && !btn.contains(e.target) && nav.classList.contains('is-open')) {
          nav.classList.remove('is-open');
        }
      });
      
      // Close on navigation
      nav.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
          nav.classList.remove('is-open');
        });
      });
    }
  }

  function initThemeToggle() {
    const btn = document.getElementById('themeToggleBtn');
    if (btn && app.storage) {
      // Init icon based on current theme
      const isDark = app.storage.getDarkMode();
      btn.innerHTML = isDark ? '<span class="themeToggle__icon" aria-hidden="true">☀️</span>' : '<span class="themeToggle__icon" aria-hidden="true">🌙</span>';

      btn.addEventListener('click', () => {
        app.storage.toggleDarkMode();
        const newIsDark = app.storage.getDarkMode();
        btn.innerHTML = newIsDark ? '<span class="themeToggle__icon" aria-hidden="true">☀️</span>' : '<span class="themeToggle__icon" aria-hidden="true">🌙</span>';
      });
    }
  }

  // Define some common globals needed by other modules
  app.state = {
    favorites: new Set(),
    profile: {}
  };
  
  app.controllers = {};
  
  app.toast = function(title, msg, type = 'info', duration = 3000) {
    const toasts = document.getElementById('toasts');
    if (!toasts) return;
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `<strong>${title}</strong><p>${msg}</p>`;
    toasts.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, duration);
  };

  app.animeToLite = function(anime) {
    if (!anime) return null;
    return {
      mal_id: anime.mal_id,
      title: anime.title || anime.title_english,
      image: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
      score: anime.score,
      episodes: anime.episodes,
      status: anime.status,
      type: anime.type,
      genres: anime.genres || []
    };
  };

  app.isAdultAnime = function(anime) {
    return anime?.rating === 'Rx - Hentai' || anime?.genres?.some(g => g.name === 'Hentai' || g.name === 'Erotica' || g.name === 'Boys Love' || g.name === 'Girls Love');
  };

  app.formatScore = function(score) {
    return Number(score) ? Number(score).toFixed(2) : '--';
  };

  app.sanitizeText = function(text) {
    if (!text) return "";
    return text.replace(/[&<>"']/g, function(m) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[m];
    });
  };

  app.debounce = function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };
  
  app.sleep = function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  app.init = init;

})();
