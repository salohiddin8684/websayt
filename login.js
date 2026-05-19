/* AnimeFlix first-load auth gate */
(function () {
  "use strict";

  const app = window.AnimeFlix;
  if (!app) return;

  const { state, toast, LS_KEYS } = app;

  const els = {
    gate: document.getElementById("authGate"),
    form: document.getElementById("authGateForm"),
    eyebrow: document.getElementById("authGateEyebrow"),
    title: document.getElementById("authGateTitle"),
    copy: document.getElementById("authGateCopy"),
    identifier: document.getElementById("authGateIdentifier"),
    password: document.getElementById("authGatePassword"),
    forgot: document.getElementById("authGateForgot"),
    error: document.getElementById("authGateError"),
    submit: document.getElementById("authGateSubmit"),
    secondary: document.getElementById("authGateSecondaryBtn"),
    switchText: document.getElementById("authGateSwitchText"),
    switchBtn: document.getElementById("authGateSwitchBtn"),
    google: document.getElementById("authGateGoogle"),
    telegram: document.getElementById("authGateTelegram"),
  };

  const STORAGE_KEYS = {
    loggedIn: "isLoggedIn",
    username: "username",
  };

  const COPY = {
    login: {
      eyebrow: "AnimeFlix Access",
      title: "Kirish",
      copy: "Akkauntingizga kiring va AnimeFlix sarguzashtini davom ettiring.",
      submit: "Kirish",
      secondary: "Ro'yxatdan o'tish",
      switchText: "Akkauntingiz yo'qmi?",
      switchAction: "Ro'yxatdan o'tish",
      forgotHidden: false,
      successTitle: "Welcome back",
      successText: "AnimeFlix sessiyasi ushbu qurilmada saqlandi.",
    },
    signup: {
      eyebrow: "New Profile",
      title: "Ro'yxatdan o'tish",
      copy: "Yangi profil yarating va AnimeFlix login sahifasiga kiring.",
      submit: "Ro'yxatdan o'tish",
      secondary: "Kirishga qaytish",
      switchText: "Akkauntingiz bormi?",
      switchAction: "Kirish",
      forgotHidden: true,
      successTitle: "Account ready",
      successText: "AnimeFlix profili yaratildi va ushbu qurilmada saqlandi.",
    },
  };

  let initialized = false;
  let closeTimer = null;

  function setAuthHash(mode) {
    if (app.isAuthenticated?.()) return;

    const nextHash = mode === "signup" ? "#/signup" : "#/login";
    if (location.hash === nextHash) return;
    history.replaceState(null, "", nextHash);
  }

  function getMode() {
    return state.auth.localSession?.mode === "signup" ? "signup" : "login";
  }

  function applyLocalSession(session) {
    state.auth.localSession = {
      active: !!session?.active,
      username: String(session?.username || "").trim(),
      mode: getMode(),
    };

    return state.auth.localSession;
  }

  function readLocalSession() {
    const loggedIn = localStorage.getItem(STORAGE_KEYS.loggedIn) === "true";
    const username = String(localStorage.getItem(STORAGE_KEYS.username) || "").trim();
    return applyLocalSession({ active: loggedIn && !!username, username });
  }

  function getLocalSession() {
    return readLocalSession();
  }

  function restoreLocalSession() {
    return readLocalSession();
  }

  function activateLocalSession({ username }) {
    const cleanUsername = String(username || "").trim();
    if (!cleanUsername) return null;

    localStorage.setItem(STORAGE_KEYS.loggedIn, "true");
    localStorage.setItem(STORAGE_KEYS.username, cleanUsername);
    return applyLocalSession({ active: true, username: cleanUsername });
  }

  function clearLocalSession() {
    localStorage.removeItem(STORAGE_KEYS.loggedIn);
    localStorage.removeItem(STORAGE_KEYS.username);
    return applyLocalSession({ active: false, username: "" });
  }

  function setMode(nextMode, { updateHash = true } = {}) {
    const mode = nextMode === "signup" ? "signup" : "login";
    const copy = COPY[mode];

    state.auth.localSession = {
      ...(state.auth.localSession || {}),
      mode,
    };

    if (!els.gate) return mode;

    els.gate.dataset.mode = mode;
    els.eyebrow.textContent = copy.eyebrow;
    els.title.textContent = copy.title;
    els.copy.textContent = copy.copy;
    els.submit.textContent = copy.submit;
    els.secondary.textContent = copy.secondary;
    els.switchText.textContent = copy.switchText;
    els.switchBtn.textContent = copy.switchAction;
    els.forgot.hidden = copy.forgotHidden;
    if (updateHash) setAuthHash(mode);
    clearError();

    return mode;
  }

  function showError(message, kind = "error") {
    if (!els.error) return;
    els.error.hidden = false;
    els.error.textContent = message;
    els.error.classList.toggle("authGate__error--info", kind === "info");
  }

  function clearError() {
    if (!els.error) return;
    els.error.hidden = true;
    els.error.textContent = "";
    els.error.classList.remove("authGate__error--info");
  }

  function openAuthGate({ mode = "login" } = {}) {
    if (!els.gate) return;
    if (app.isAuthenticated?.()) {
      closeAuthGate({ immediate: true });
      return;
    }

    window.clearTimeout(closeTimer);
    setMode(mode);
    clearError();
    document.body.classList.add("auth-locked");
    els.gate.hidden = false;
    els.gate.setAttribute("aria-hidden", "false");

    requestAnimationFrame(() => {
      els.gate.classList.add("is-open");
      els.identifier?.focus({ preventScroll: true });
    });
  }

  function closeAuthGate({ immediate = false } = {}) {
    if (!els.gate) return;

    window.clearTimeout(closeTimer);
    els.gate.classList.remove("is-open");
    els.gate.setAttribute("aria-hidden", "true");
    document.body.classList.remove("auth-locked");

    if (immediate) {
      els.gate.hidden = true;
      return;
    }

    closeTimer = window.setTimeout(() => {
      els.gate.hidden = true;
    }, 320);
  }

  function submitLocalSession({ identifier, password, mode }) {
    const cleanIdentifier = String(identifier || "").trim();
    const cleanPassword = String(password || "").trim();

    if (!cleanIdentifier || !cleanPassword) {
      showError("Username yoki password maydoni bo'sh qolmasligi kerak.");
      return false;
    }

    const copy = COPY[mode];
    activateLocalSession({ username: cleanIdentifier });
    app.setProfileUsername?.(cleanIdentifier);
    app.updateAuthUI?.();
    closeAuthGate();
    location.hash = "#/";
    toast(copy.successTitle, copy.successText, "ok", 2600);
    return true;
  }

  function handleSubmit(event) {
    event.preventDefault();

    const wasSubmitted = submitLocalSession({
      identifier: els.identifier?.value,
      password: els.password?.value,
      mode: getMode(),
    });

    if (wasSubmitted) {
      els.form?.reset();
    }
  }

  function handleToggleMode(nextMode) {
    setMode(nextMode);
    els.identifier?.focus({ preventScroll: true });
  }

  function handleSocialClick(provider) {
    showError(`${provider} orqali kirish keyingi bosqichda ulanadi.`, "info");
  }

  function handleForgotPassword() {
    showError("Hozircha mahalliy sessiya ishlatiladi. Istalgan password bilan kirishingiz mumkin.", "info");
  }

  function initAuthGate() {
    if (initialized || !els.gate) return;
    initialized = true;

    state.auth.localSession = {
      active: false,
      username: "",
      mode: "login",
    };

    restoreLocalSession();
    setMode("login", { updateHash: false });

    els.form?.addEventListener("submit", handleSubmit);
    els.secondary?.addEventListener("click", () => {
      handleToggleMode(getMode() === "login" ? "signup" : "login");
    });
    els.switchBtn?.addEventListener("click", () => {
      handleToggleMode(getMode() === "login" ? "signup" : "login");
    });
    els.forgot?.addEventListener("click", handleForgotPassword);
    els.google?.addEventListener("click", () => handleSocialClick("Google"));
    els.telegram?.addEventListener("click", () => handleSocialClick("Telegram"));

    const hasRemoteToken = Boolean(localStorage.getItem(LS_KEYS.authToken));
    if (state.auth.localSession.active || hasRemoteToken) {
      closeAuthGate({ immediate: true });
      return;
    }

    closeAuthGate({ immediate: true });
  }

  app.getLocalSession = getLocalSession;
  app.restoreLocalSession = restoreLocalSession;
  app.activateLocalSession = activateLocalSession;
  app.clearLocalSession = clearLocalSession;
  app.setAuthGateMode = setMode;
  app.openAuthGate = openAuthGate;
  app.closeAuthGate = closeAuthGate;
  app.initAuthGate = initAuthGate;
})();
