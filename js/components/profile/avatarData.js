/* Profile shared data */
(function () {
  "use strict";

  const app = window.AnimeFlix;
  if (!app) return;

  const PROFILE_AVATARS = [
    "akira",
    "asuka",
    "hinata",
    "itachi",
    "kakashi",
    "luffy",
    "makima",
    "mikasa",
    "mob",
    "nami",
    "nezuko",
    "rei",
    "rem",
    "sailor",
    "senku",
    "shinji",
    "tanjiro",
    "vash",
    "yor",
    "yusuke",
    "zero-two",
    "zoro",
    "animeflix-purple",
    "animeflix-blue",
  ].map((seed) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`);

  const PROFILE_BANNERS = [
    {
      id: "violet-night",
      name: "Violet Night",
      background:
        "radial-gradient(900px 420px at 20% 20%, rgba(124,92,255,.42), transparent 64%), radial-gradient(800px 460px at 82% 12%, rgba(6,182,212,.26), transparent 62%), linear-gradient(135deg, #070816, #15112f 52%, #061827)",
    },
    {
      id: "shonen-surge",
      name: "Shonen Surge",
      background:
        "radial-gradient(820px 380px at 20% 8%, rgba(239,68,68,.30), transparent 64%), radial-gradient(760px 420px at 88% 16%, rgba(245,158,11,.22), transparent 62%), linear-gradient(135deg, #0b0712, #1e1028 55%, #0b1324)",
    },
    {
      id: "aqua-idol",
      name: "Aqua Idol",
      background:
        "radial-gradient(860px 420px at 22% 18%, rgba(6,182,212,.36), transparent 64%), radial-gradient(780px 460px at 86% 10%, rgba(99,102,241,.28), transparent 62%), linear-gradient(135deg, #04111f, #0f1d3c 54%, #10112a)",
    },
    {
      id: "midnight-arc",
      name: "Midnight Arc",
      background:
        "radial-gradient(900px 420px at 18% 14%, rgba(168,85,247,.34), transparent 66%), radial-gradient(760px 440px at 84% 12%, rgba(59,130,246,.24), transparent 62%), linear-gradient(135deg, #030712, #111827 54%, #0f172a)",
    },
  ];

  const PROFILE_ACCENTS = [
    { id: "purple", name: "Purple", value: "#8b5cf6" },
    { id: "indigo", name: "Indigo", value: "#6366f1" },
    { id: "cyan", name: "Cyan", value: "#06b6d4" },
    { id: "rose", name: "Rose", value: "#f43f5e" },
    { id: "emerald", name: "Emerald", value: "#22c55e" },
  ];

  const DEFAULT_PROFILE_AVATAR =
    "https://api.dicebear.com/7.x/avataaars/svg?seed=animeflix-default&backgroundColor=b6e3f4";

  app.PROFILE_AVATARS = PROFILE_AVATARS;
  app.PROFILE_BANNERS = PROFILE_BANNERS;
  app.PROFILE_ACCENTS = PROFILE_ACCENTS;
  app.DEFAULT_PROFILE_AVATAR = DEFAULT_PROFILE_AVATAR;
})();
