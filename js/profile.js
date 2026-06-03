/* AnimeFlix profile components wrapper */
(function () {
  "use strict";

  const app = window.AnimeFlix;
  if (!app) return;

  function renderProfilePage(viewId) {
    const root = document.getElementById('profilePageRoot');
    if (!root) return;

    const user = app.storage.getUser();
    if (!user) {
      window.location.hash = '#/login';
      return;
    }

    if (viewId === 'profile') {
      root.innerHTML = renderProfileMain(user);
    } else if (viewId === 'profileSettings') {
      root.innerHTML = renderSettings(user);
      bindSettingsEvents(user);
    } else if (viewId === 'profileHistory') {
      root.innerHTML = renderHistory(user);
      bindHistoryEvents(user);
    } else if (viewId === 'profileContinue') {
      root.innerHTML = renderContinue(user);
    }
  }

  function renderProfileMain(user) {
    const watchCount = user.watchHistory?.length || 0;
    const favCount = user.favorites?.length || 0;
    const hrs = Math.floor(watchCount * 24 / 60);

    return `
      <div class="profile-banner"></div>
      <div class="container profile-container">
        <div class="profile-header">
          <div class="profile-avatar-large">
            <img src="${user.avatar || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%237c3aed'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23fff' font-family='Arial' font-size='40' dy='.3em'%3E${user.username.charAt(0).toUpperCase()}%3C/text%3E%3C/svg%3E`}" alt="Avatar">
            <button class="btn btn--icon profile-edit-avatar" aria-label="Edit Avatar">✏️</button>
          </div>
          <div class="profile-info">
            <h1 class="profile-name">${user.username}</h1>
            <p class="profile-email">${user.email}</p>
            <div class="profile-rank-badge">${user.rank || 'Anime Rookie'}</div>
          </div>
        </div>

        <div class="profile-stats-grid">
          <div class="stat-card">
            <h3>Watched</h3>
            <p>${watchCount}</p>
          </div>
          <div class="stat-card">
            <h3>Favorites</h3>
            <p>${favCount}</p>
          </div>
          <div class="stat-card">
            <h3>Hours</h3>
            <p>${hrs}</p>
          </div>
        </div>
        
        <div class="profile-rank-section">
          <h3>Rank Progress</h3>
          <p>Total Episodes Watched: ${user.totalWatched || 0}</p>
          <div class="progress-bar-wrap">
            <div class="progress-bar" style="width: ${Math.min(100, ((user.totalWatched || 0) / 500) * 100)}%"></div>
          </div>
        </div>
      </div>
    `;
  }

  function renderSettings(user) {
    const isDark = app.storage.getDarkMode();
    return `
      <div class="container" style="padding-top: 2rem;">
        <h2>Settings</h2>
        <div class="settings-card">
          <h3>Account Settings</h3>
          <form id="settingsForm">
            <label class="authForm__field">
              <span>Username</span>
              <input type="text" id="settingName" value="${user.username}" required>
            </label>
            <label class="authForm__field">
              <span>Email</span>
              <input type="email" id="settingEmail" value="${user.email}" required>
            </label>
            <label class="authForm__field">
              <span>New Password (optional)</span>
              <input type="password" id="settingPass">
            </label>
            <button class="btn btn--primary" type="submit">Save Changes</button>
          </form>
        </div>
        
        <div class="settings-card">
          <h3>Appearance & Preferences</h3>
          <label style="display:flex;align-items:center;gap:1rem;">
            <input type="checkbox" id="settingDarkMode" ${isDark ? 'checked' : ''}>
            Dark Mode
          </label>
          <br>
          <label style="display:flex;align-items:center;gap:1rem;">
            Language:
            <select style="padding:0.5rem;background:var(--color-surface);color:white;border:1px solid var(--color-border);border-radius:4px;">
              <option>English</option>
              <option>O'zbek</option>
              <option>Русский</option>
            </select>
          </label>
        </div>

        <div class="settings-card" style="border-color: var(--color-danger);">
          <h3 style="color: var(--color-danger);">Danger Zone</h3>
          <button class="btn" style="background: var(--color-danger); color: white;" id="deleteAccBtn">Delete Account</button>
        </div>
      </div>
    `;
  }

  function bindSettingsEvents(user) {
    document.getElementById('settingsForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      user.username = document.getElementById('settingName').value;
      user.email = document.getElementById('settingEmail').value;
      app.storage.saveUser(user);
      app.auth.updateNavbar();
      app.toast('Success', 'Profile updated successfully!', 'success');
    });

    document.getElementById('settingDarkMode')?.addEventListener('change', () => {
      app.storage.toggleDarkMode();
    });

    document.getElementById('deleteAccBtn')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to completely delete your account?')) {
        app.storage.clearUser();
        window.location.hash = '#/';
        window.location.reload();
      }
    });
  }

  function renderHistory(user) {
    const history = user.watchHistory || [];
    let html = `<div class="container" style="padding-top: 2rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <h2>Watch History</h2>
        <button class="btn btn--ghost" id="clearHistoryBtn">Clear History</button>
      </div>`;
      
    if (history.length === 0) {
      html += `<div class="empty">History is empty</div></div>`;
      return html;
    }

    html += `<div class="grid grid--tight">`;
    html += history.map(h => `
      <div class="card" style="background:var(--color-surface); border-radius:var(--radius); overflow:hidden;">
        <img src="${h.image}" style="width:100%; aspect-ratio: 16/9; object-fit:cover;">
        <div style="padding: 1rem;">
          <h4 style="margin:0 0 0.5rem 0;">${h.title}</h4>
          <p style="margin:0; color:var(--color-text-muted); font-size:0.875rem;">Episode ${h.episode} • ${new Date(h.date).toLocaleDateString()}</p>
        </div>
      </div>
    `).join('');
    html += `</div></div>`;
    return html;
  }

  function bindHistoryEvents(user) {
    document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
      if(confirm('Clear all watch history?')) {
        user.watchHistory = [];
        app.storage.saveUser(user);
        renderProfilePage('profileHistory');
        app.toast('Cleared', 'Watch history cleared');
      }
    });
  }

  function renderContinue(user) {
    const list = user.continueWatching || [];
    let html = `<div class="container" style="padding-top: 2rem;"><h2>Continue Watching</h2>`;
      
    if (list.length === 0) {
      html += `<div class="empty">No active shows</div></div>`;
      return html;
    }

    html += `<div class="grid grid--tight">`;
    html += list.map(c => `
      <a href="#/anime/${c.mal_id}" class="card" style="background:var(--color-surface); border-radius:var(--radius); overflow:hidden; display:block;">
        <img src="${c.image}" style="width:100%; aspect-ratio: 16/9; object-fit:cover;">
        <div class="progress-bar-wrap" style="height:4px;background:var(--color-surface-2);">
          <div class="progress-bar" style="height:100%;width:${c.progress || 0}%;background:var(--color-accent);"></div>
        </div>
        <div style="padding: 1rem;">
          <h4 style="margin:0 0 0.5rem 0;">${c.title}</h4>
          <p style="margin:0; color:var(--color-text-muted); font-size:0.875rem;">Episode ${c.episode}</p>
        </div>
      </a>
    `).join('');
    html += `</div></div>`;
    return html;
  }

  app.renderProfilePage = renderProfilePage;

  // Header Dropdown Logic
  document.addEventListener('DOMContentLoaded', () => {
    const profileBtn = document.getElementById('profileBtn');
    const profileMenu = document.getElementById('profileMenu');
    if (profileBtn && profileMenu) {
      profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = profileMenu.hidden;
        profileMenu.hidden = !isHidden;
        profileBtn.setAttribute('aria-expanded', !isHidden);
      });
      document.addEventListener('click', (e) => {
        if (!profileMenu.contains(e.target) && !profileBtn.contains(e.target)) {
          profileMenu.hidden = true;
          profileBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }
  });

})();
