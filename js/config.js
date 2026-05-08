// Update authApiBase to your deployed Render or Railway backend before production deployment.
window.AnimeFlixConfig = Object.freeze({
  animeApiBase: "/.netlify/functions/anime",
  authApiBase:
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:5000/api"
      : "https://animeflix-auth.onrender.com/api",
});
