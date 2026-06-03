/* LocalStorage Manager */
(function() {
  "use strict";

  const app = window.AnimeFlix || {};
  window.AnimeFlix = app;

  const USER_KEY = 'animeflix_user';
  const DARK_MODE_KEY = 'darkMode';

  function initStorage() {
    if (!localStorage.getItem(USER_KEY)) {
      const defaultUser = {
        username: '',
        email: '',
        avatar: '',
        favorites: [],
        watchHistory: [],
        continueWatching: [],
        rank: 'Anime Rookie',
        totalWatched: 0
      };
      localStorage.setItem(USER_KEY, JSON.stringify(defaultUser));
    }

    if (localStorage.getItem(DARK_MODE_KEY) === 'true') {
      document.body.classList.add('dark-mode');
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      document.body.setAttribute('data-theme', 'light');
    }
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY)) || null;
    } catch {
      return null;
    }
  }

  function saveUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearUser() {
    localStorage.removeItem(USER_KEY);
  }

  function toggleFavorite(anime) {
    const user = getUser();
    if (!user) return false;

    const index = user.favorites.findIndex(a => a.mal_id === anime.mal_id);
    let isAdded = false;
    
    if (index === -1) {
      user.favorites.push({
        mal_id: anime.mal_id,
        title: anime.title || anime.title_english,
        image: anime.image || anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
        score: anime.score,
        episodes: anime.episodes,
        status: anime.status,
        type: anime.type,
        addedAt: Date.now()
      });
      isAdded = true;
    } else {
      user.favorites.splice(index, 1);
      isAdded = false;
    }
    
    saveUser(user);
    return isAdded;
  }

  function isFavorite(id) {
    const user = getUser();
    if (!user) return false;
    return user.favorites.some(a => a.mal_id === Number(id));
  }

  function addHistory(anime, episode) {
    const user = getUser();
    if (!user) return;

    const historyItem = {
      mal_id: anime.mal_id,
      title: anime.title || anime.title_english,
      image: anime.image || anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
      episode: episode || 1,
      date: Date.now()
    };

    // Remove existing if any
    user.watchHistory = user.watchHistory.filter(h => h.mal_id !== anime.mal_id);
    user.watchHistory.unshift(historyItem);
    
    if (user.watchHistory.length > 100) {
      user.watchHistory = user.watchHistory.slice(0, 100);
    }

    user.totalWatched++;
    user.rank = calculateRank(user.totalWatched);
    
    saveUser(user);
  }

  function addContinueWatching(anime, episode, progressPercent) {
    const user = getUser();
    if (!user) return;

    const contItem = {
      mal_id: anime.mal_id,
      title: anime.title || anime.title_english,
      image: anime.image || anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
      episode: episode,
      progress: progressPercent,
      updatedAt: Date.now()
    };

    user.continueWatching = user.continueWatching.filter(c => c.mal_id !== anime.mal_id);
    user.continueWatching.unshift(contItem);

    if (user.continueWatching.length > 50) {
      user.continueWatching = user.continueWatching.slice(0, 50);
    }

    saveUser(user);
  }

  function calculateRank(total) {
    if (total <= 10) return 'Anime Rookie';
    if (total <= 50) return 'Anime Fan';
    if (total <= 100) return 'Anime Veteran';
    if (total <= 500) return 'Anime Master';
    return 'Anime Legend';
  }

  function toggleDarkMode() {
    const isDark = localStorage.getItem(DARK_MODE_KEY) === 'true';
    if (isDark) {
      localStorage.setItem(DARK_MODE_KEY, 'false');
      document.body.classList.remove('dark-mode');
      document.body.setAttribute('data-theme', 'light');
    } else {
      localStorage.setItem(DARK_MODE_KEY, 'true');
      document.body.classList.add('dark-mode');
      document.body.setAttribute('data-theme', 'dark');
    }
  }
  
  function getDarkMode() {
    return localStorage.getItem(DARK_MODE_KEY) === 'true';
  }

  app.storage = {
    init: initStorage,
    getUser,
    saveUser,
    clearUser,
    toggleFavorite,
    isFavorite,
    addHistory,
    addContinueWatching,
    calculateRank,
    toggleDarkMode,
    getDarkMode
  };

  // Init on load
  initStorage();

})();
