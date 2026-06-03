/* Auth Manager */
(function() {
  "use strict";

  const app = window.AnimeFlix || {};
  window.AnimeFlix = app;

  function initAuth() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const logoutBtn = document.getElementById('profileLogoutBtn');

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginUsername').value.trim();
        const pass = document.getElementById('loginPassword').value.trim();
        
        if (!email || !pass) {
          showAuthError('loginError', 'Iltimos barcha maydonlarni to\'ldiring');
          return;
        }

        // Mock login - just create/update local user if not exists, or login
        let user = app.storage.getUser();
        if (!user || user.email !== email && user.username !== email) {
          // If no user found, mock login by creating one just for ease of use
          user = {
            username: email.split('@')[0],
            email: email,
            avatar: '',
            favorites: [],
            watchHistory: [],
            continueWatching: [],
            rank: 'Anime Rookie',
            totalWatched: 0
          };
        }
        
        app.storage.saveUser(user);
        updateNavbarAuth();
        window.history.back(); // Redirect to previous page
      });
    }

    if (registerForm) {
      registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const pass = document.getElementById('registerPassword').value.trim();

        if (!name || !email || !pass) {
          showAuthError('registerError', 'Iltimos barcha maydonlarni to\'ldiring');
          return;
        }

        const newUser = {
          username: name,
          email: email,
          avatar: '',
          favorites: [],
          watchHistory: [],
          continueWatching: [],
          rank: 'Anime Rookie',
          totalWatched: 0
        };

        app.storage.saveUser(newUser);
        updateNavbarAuth();
        window.location.hash = '#/'; // Go to home after register
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('Akkauntdan chiqishni xohlaysizmi?')) {
          app.storage.clearUser();
          updateNavbarAuth();
          window.location.hash = '#/';
        }
      });
    }

    updateNavbarAuth();
  }

  function showAuthError(elementId, msg) {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = msg;
      el.hidden = false;
    }
  }

  function updateNavbarAuth() {
    const user = app.storage.getUser();
    const guestActions = document.getElementById('authGuestActions');
    const userActions = document.getElementById('authUserActions');

    if (user && user.username) {
      if (guestActions) guestActions.hidden = true;
      if (userActions) userActions.hidden = false;

      // Update profile dropdown info
      document.getElementById('profileUsername').textContent = user.username;
      document.getElementById('profileEmail').textContent = user.email;
      document.getElementById('profileDropdownRank').textContent = user.rank || 'Anime Rookie';
      
      const avatarSrc = user.avatar || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%237c3aed'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23fff' font-family='Arial' font-size='40' dy='.3em'%3E${user.username.charAt(0).toUpperCase()}%3C/text%3E%3C/svg%3E`;
      document.getElementById('userAvatarImg').src = avatarSrc;
      document.getElementById('profilePreviewImg').src = avatarSrc;

      document.getElementById('profileDropdownFavoritesCount').textContent = user.favorites ? user.favorites.length : 0;
      document.getElementById('profileDropdownContinueCount').textContent = user.continueWatching ? user.continueWatching.length : 0;
      document.getElementById('profileDropdownHistoryCount').textContent = user.watchHistory ? user.watchHistory.length : 0;
    } else {
      if (guestActions) guestActions.hidden = false;
      if (userActions) userActions.hidden = true;
    }
  }

  app.auth = {
    init: initAuth,
    updateNavbar: updateNavbarAuth
  };

  // Nav Login Btn
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loginNavBtn')?.addEventListener('click', () => {
      window.location.hash = '#/login';
    });
  });

})();
