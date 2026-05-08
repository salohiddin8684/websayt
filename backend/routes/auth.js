const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FAVORITES = 50;
const MAX_CONTINUE = 18;

function createToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
}

function normalizeTheme(theme) {
  return theme === "light" ? "light" : "dark";
}

function sanitizeGenre(genre) {
  const malId = Number(genre?.mal_id);
  const name = String(genre?.name || "").trim();

  if (!Number.isFinite(malId) || malId <= 0 || !name) return null;
  return {
    mal_id: malId,
    name: name.slice(0, 80),
  };
}

function sanitizeAnimeItem(item) {
  const malId = Number(item?.mal_id);
  const title = String(item?.title || "").trim();

  if (!Number.isFinite(malId) || malId <= 0 || !title) return null;

  const score = Number(item?.score);
  const episodes = Number(item?.episodes);

  return {
    mal_id: malId,
    title: title.slice(0, 220),
    score: Number.isFinite(score) ? score : null,
    episodes: Number.isFinite(episodes) ? episodes : null,
    synopsis: String(item?.synopsis || "").trim().slice(0, 3000),
    image: String(item?.image || "").trim().slice(0, 600),
    url: String(item?.url || "").trim().slice(0, 600),
    genres: Array.isArray(item?.genres) ? item.genres.map(sanitizeGenre).filter(Boolean).slice(0, 12) : [],
    rating: String(item?.rating || "").trim().slice(0, 80),
    explicitGenres: Array.isArray(item?.explicitGenres)
      ? item.explicitGenres.map(sanitizeGenre).filter(Boolean).slice(0, 12)
      : [],
    trailerUrl: String(item?.trailerUrl || "").trim().slice(0, 600),
    updatedAt: new Date(),
  };
}

function sanitizeAnimeList(items, limit) {
  const list = Array.isArray(items) ? items : [];
  const unique = new Map();

  list.forEach((item) => {
    const sanitized = sanitizeAnimeItem(item);
    if (!sanitized) return;
    if (unique.has(sanitized.mal_id)) return;
    unique.set(sanitized.mal_id, sanitized);
  });

  return Array.from(unique.values()).slice(0, limit);
}

function mergeAnimeLists(primary, secondary, limit) {
  return sanitizeAnimeList([...(primary || []), ...(secondary || [])], limit);
}

function validateRegisterInput({ fullName, username, email, password }) {
  if (!fullName || !username || !email || !password) {
    return "All fields are required.";
  }

  if (!EMAIL_REGEX.test(email)) {
    return "Please enter a valid email address.";
  }

  if (username.length < 3) {
    return "Username must be at least 3 characters.";
  }

  if (password.length < 6) {
    return "Password must be at least 6 characters.";
  }

  return null;
}

router.post("/register", async (req, res) => {
  try {
    const fullName = String(req.body?.fullName || "").trim();
    const username = String(req.body?.username || "").trim().toLowerCase();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    const validationError = validateRegisterInput({ fullName, username, email, password });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(409).json({
        message: existingUser.email === email ? "Email is already in use." : "Username is already taken.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      fullName,
      username,
      email,
      password: hashedPassword,
    });

    return res.status(201).json({
      token: createToken(user._id),
      user: user.toSafeObject(),
    });
  } catch {
    return res.status(500).json({ message: "Could not create account. Please try again later." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const identifier = String(req.body?.identifier || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!identifier || !password) {
      return res.status(400).json({ message: "Email or username and password are required." });
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    return res.json({
      token: createToken(user._id),
      user: user.toSafeObject(),
    });
  } catch {
    return res.status(500).json({ message: "Could not log in. Please try again later." });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  return res.json({ user: req.user.toSafeObject() });
});

router.post("/sync", authMiddleware, async (req, res) => {
  try {
    const favoriteItems = sanitizeAnimeList(req.body?.favorites, MAX_FAVORITES);
    const continueItems = sanitizeAnimeList(req.body?.continueWatching, MAX_CONTINUE);
    const nextTheme =
      req.body?.themePreference === "light" || req.body?.themePreference === "dark"
        ? normalizeTheme(req.body.themePreference)
        : null;

    if (favoriteItems.length > 0) {
      req.user.favorites = mergeAnimeLists(favoriteItems, req.user.favorites, MAX_FAVORITES);
    }

    if (continueItems.length > 0) {
      req.user.continueWatching = mergeAnimeLists(continueItems, req.user.continueWatching, MAX_CONTINUE);
    }

    if (nextTheme) {
      req.user.themePreference = nextTheme;
    }

    await req.user.save();
    return res.json({ user: req.user.toSafeObject() });
  } catch {
    return res.status(500).json({ message: "Could not sync account data." });
  }
});

router.put("/favorites", authMiddleware, async (req, res) => {
  try {
    req.user.favorites = sanitizeAnimeList(req.body?.favorites, MAX_FAVORITES);
    await req.user.save();
    return res.json({ user: req.user.toSafeObject() });
  } catch {
    return res.status(500).json({ message: "Could not save favorites." });
  }
});

router.put("/continue-watching", authMiddleware, async (req, res) => {
  try {
    req.user.continueWatching = sanitizeAnimeList(req.body?.continueWatching, MAX_CONTINUE);
    await req.user.save();
    return res.json({ user: req.user.toSafeObject() });
  } catch {
    return res.status(500).json({ message: "Could not save continue watching." });
  }
});

router.put("/theme", authMiddleware, async (req, res) => {
  try {
    if (req.body?.themePreference !== "light" && req.body?.themePreference !== "dark") {
      return res.status(400).json({ message: "Theme preference must be light or dark." });
    }

    req.user.themePreference = normalizeTheme(req.body?.themePreference);
    await req.user.save();
    return res.json({ user: req.user.toSafeObject() });
  } catch {
    return res.status(500).json({ message: "Could not save theme preference." });
  }
});

module.exports = router;
