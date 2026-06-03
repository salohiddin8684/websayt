const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

// 1. Head
content = content.replace(
  '<meta name="description" content="Browse top anime, search titles, and save favorites using the Jikan API." />',
  '<meta name="description" content="Browse top anime, search titles, and save favorites using the Jikan API." />\n    <meta property="og:title" content="AnimeFlix — Streaming & Tracking" />\n    <meta property="og:description" content="Browse top anime, search titles, and save favorites using the Jikan API." />\n    <meta property="og:image" content="/favicon.svg" />\n    <meta property="og:url" content="https://animeflix.com" />'
);

content = content.replace('<link rel="stylesheet" href="login.css" />\n', '');

// 2. AuthGate removal
content = content.replace(/<!-- First-load auth gate -->[\s\S]*?<\/section>\s+<!-- DETAILS VIEW -->/, '<!-- DETAILS VIEW -->');

// 3. Header logo and hamburger
content = content.replace(
  /<a class="brand" href="#\/" id="brandHome" aria-label="AnimeFlix home">\s*<span class="brand__mark">A<\/span>\s*<span class="brand__name">AnimeFlix<\/span>\s*<\/a>/,
  '<button class="btn btn--icon hamburger-btn" id="mobileMenuBtn" aria-label="Toggle menu" type="button">\n            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>\n          </button>\n          <a class="brand" href="#/" id="brandHome" aria-label="AnimeFlix home">\n            <span class="brand__mark">\n              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px; color: var(--color-accent);"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>\n            </span>\n            <span class="brand__name">AnimeFlix</span>\n          </a>'
);

// 4. Update dropdown links
content = content.replace(/href="\/profile\/continue"/g, 'href="#/profile/continue"');
content = content.replace(/href="\/profile\/favorites"/g, 'href="#/profile/favorites"');
content = content.replace(/href="\/profile\/history"/g, 'href="#/profile/history"');
content = content.replace(/href="\/profile"/g, 'href="#/profile"');
content = content.replace(/href="\/profile\/settings"/g, 'href="#/profile/settings"');

// 5. Auth Views in main
content = content.replace(
  '<main>',
  `<main>
      <!-- AUTH VIEWS -->
      <section class="authView section" id="viewLogin" data-view="login" hidden>
        <div class="container authView__inner">
          <form class="authForm" id="loginForm" novalidate>
            <h2 class="authForm__title">Tizimga kirish</h2>
            <p class="authForm__subtitle">Sarguzashtni davom ettiring</p>
            <label class="authForm__field">
              <span>Foydalanuvchi nomi yoki Email</span>
              <input id="loginUsername" type="text" autocomplete="username" required />
            </label>
            <label class="authForm__field">
              <span>Parol</span>
              <input id="loginPassword" type="password" autocomplete="current-password" required />
            </label>
            <p class="authForm__error" id="loginError" hidden></p>
            <button class="btn btn--primary authForm__submit" type="submit">Kirish</button>
            <p class="authForm__switch">Hisobingiz yo'qmi? <a href="#/register">Ro'yxatdan o'tish</a></p>
          </form>
        </div>
      </section>

      <section class="authView section" id="viewRegister" data-view="register" hidden>
        <div class="container authView__inner">
          <form class="authForm" id="registerForm" novalidate>
            <h2 class="authForm__title">Ro'yxatdan o'tish</h2>
            <p class="authForm__subtitle">Yangi sarguzashtni boshlang</p>
            <label class="authForm__field">
              <span>Ismingiz</span>
              <input id="registerName" type="text" autocomplete="name" required />
            </label>
            <label class="authForm__field">
              <span>Email</span>
              <input id="registerEmail" type="email" autocomplete="email" required />
            </label>
            <label class="authForm__field">
              <span>Parol</span>
              <input id="registerPassword" type="password" autocomplete="new-password" required />
            </label>
            <p class="authForm__error" id="registerError" hidden></p>
            <button class="btn btn--primary authForm__submit" type="submit">A'zo bo'lish</button>
            <p class="authForm__switch">Allaqachon hisobingiz bormi? <a href="#/login">Kirish</a></p>
          </form>
        </div>
      </section>

      <!-- NOT FOUND VIEW -->
      <section class="notFound section" id="viewNotFound" data-view="notfound" hidden>
        <div class="container">
          <div class="empty">
            <h1 class="empty__title">404 - Sahifa topilmadi</h1>
            <p class="empty__text">Siz qidirayotgan anime o'lchamida adashib qoldingiz.</p>
            <a href="#/" class="btn btn--primary">Bosh sahifaga qaytish</a>
          </div>
        </div>
      </section>`
);

// 6. Fix scripts
content = content.replace('<script src="js/config.js" defer></script>', '<script src="js/config.js" defer></script>\n    <script src="js/storage.js" defer></script>\n    <script src="js/router.js" defer></script>');
content = content.replace('    <script src="js/storage.js" defer></script>\n', ''); // Remove second one
content = content.replace('    <script src="login.js" defer></script>\n', '');

fs.writeFileSync('index.html', content);
console.log('done');
