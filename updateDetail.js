const fs = require('fs');
let content = fs.readFileSync('js/detail.js', 'utf8');

content = content.replace(
  'await app.recordAnimeVisit?.(lite, { episode: activeEpisode, incrementEpisode: false });',
  'if (app.storage?.addHistory) app.storage.addHistory(lite, activeEpisode);'
);

content = content.replace(
  'await app.recordAnimeVisit?.(lite, { episode: activeEpisode, incrementEpisode: false });',
  'if (app.storage?.addHistory) app.storage.addHistory(lite, activeEpisode);\n      if (app.storage?.addContinueWatching) app.storage.addContinueWatching(lite, activeEpisode, 10);'
);

content = content.replace(
  'src="https://www.youtube.com/embed/${escapeHtml(youtubeId)}"',
  'src="https://www.youtube.com/embed/${escapeHtml(youtubeId)}?rel=0&modestbranding=1"'
);

content = content.replace(
  'app.refreshFavButtons?.();',
  'const favBtn = document.getElementById("detailsFavBtn");\n      if (favBtn) {\n        const isFav = app.storage?.isFavorite(lite.mal_id);\n        favBtn.textContent = isFav ? "Sevimlilardan olib tashlash" : "Add to favorites";\n        favBtn.onclick = () => {\n          const added = app.storage?.toggleFavorite(lite);\n          favBtn.textContent = added ? "Sevimlilardan olib tashlash" : "Add to favorites";\n          app.toast?.(added ? "Qo\'shildi" : "Olib tashlandi", added ? "Sevimlilarga qo\'shildi" : "Sevimlilardan olib tashlandi");\n        };\n      }'
);

fs.writeFileSync('js/detail.js', content);
console.log('done detail.js');
