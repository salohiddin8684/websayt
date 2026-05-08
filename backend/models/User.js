const mongoose = require("mongoose");

const genreSchema = new mongoose.Schema(
  {
    mal_id: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const animeItemSchema = new mongoose.Schema(
  {
    mal_id: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    score: { type: Number, default: null },
    episodes: { type: Number, default: null },
    synopsis: { type: String, default: "" },
    image: { type: String, default: "" },
    url: { type: String, default: "" },
    genres: { type: [genreSchema], default: [] },
    rating: { type: String, default: "" },
    explicitGenres: { type: [genreSchema], default: [] },
    trailerUrl: { type: String, default: "" },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 40,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 160,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    favorites: {
      type: [animeItemSchema],
      default: [],
    },
    continueWatching: {
      type: [animeItemSchema],
      default: [],
    },
    themePreference: {
      type: String,
      enum: ["dark", "light"],
      default: "dark",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  },
);

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    _id: this._id,
    fullName: this.fullName,
    username: this.username,
    email: this.email,
    favorites: this.favorites,
    continueWatching: this.continueWatching,
    themePreference: this.themePreference,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
