const fs = require('fs');
let content = fs.readFileSync('js/filter.js', 'utf8');

// Replace state.favorites checks
content = content.replace(/state\.favorites\?\.has\?\.?\(Number\(([^)]+)\)\)/g, 'app.storage?.isFavorite($1)');

// Replace toggleFavorite
content = content.replace(/app\.toggleFavorite\?\.\(anime\);/g, 'app.storage?.toggleFavorite(anime);');

// Read hash param 'genre'
content = content.replace(/let filters = createDefaultFilters\(\);/g, `
  function getHashParams() {
    const hash = window.location.hash;
    const params = {};
    const qIndex = hash.indexOf('?');
    if (qIndex !== -1) {
      const qs = hash.substring(qIndex + 1);
      const searchParams = new URLSearchParams(qs);
      for (const [k, v] of searchParams.entries()) {
        params[k] = v;
      }
    }
    return params;
  }

  let filters = createDefaultFilters();
`);

content = content.replace(/filters = createDefaultFilters\(\);/g, `
        filters = createDefaultFilters();
        const urlParams = getHashParams();
        if (urlParams.genre) filters.genre = urlParams.genre;
`);

content = content.replace(/loadGenres\(\);/g, `loadGenres();
      const urlParams = getHashParams();
      if (urlParams.genre) filters.genre = urlParams.genre;
`);

fs.writeFileSync('js/filter.js', content);
console.log('done filter.js');
