/* AnimeFlix custom HTML5 video player */
(function () {
  "use strict";

  const app = window.AnimeFlix;
  if (!app) return;

  const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
  const QUALITIES = ["Auto", "1080p", "720p", "480p", "360p"];

  let cleanupActivePlayer = null;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);
  }

  function icon(name) {
    const icons = {
      play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
      pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z" fill="currentColor"/></svg>',
      volume: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.2a5 5 0 0 1 0 7.6M18.5 5.8a8.5 8.5 0 0 1 0 12.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="m17 9 4 4m0-4-4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
      fullscreen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M8 21H3v-5m18 0v5h-5" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      exitFullscreen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3v6H3m12-6v6h6M9 21v-6H3m12 6v-6h6" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      rewind: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m11 7-6 5 6 5V7Zm8 0-6 5 6 5V7Z" fill="currentColor"/></svg>',
      forward: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 7 6 5-6 5V7ZM5 7l6 5-6 5V7Z" fill="currentColor"/></svg>',
    };
    return icons[name] || "";
  }

  function speedLabel(value) {
    return value === 1 ? "Normal" : `${value}x`;
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hours) return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  }

  function mountHtml5Player(host, options = {}) {
    if (!host) return null;
    destroyActivePlayer();

    const source = String(options.src || "").trim();
    const poster = String(options.poster || "").trim();
    const title = String(options.title || "Anime video");

    host.innerHTML = `
      <div class="afPlayer" data-player aria-label="${escapeHtml(title)} player">
        <div class="afPlayer__stage" data-stage>
          <video class="afPlayer__video" data-video preload="metadata" playsinline></video>
          <div class="afPlayer__center" data-center-icon></div>
          <div class="afPlayer__skip afPlayer__skip--left" data-skip-left>-10s</div>
          <div class="afPlayer__skip afPlayer__skip--right" data-skip-right>+10s</div>
          <div class="afPlayer__hold" data-hold-indicator>2x</div>
        </div>

        <div class="afPlayer__controls" data-controls>
          <div class="afPlayer__progressWrap" data-progress-wrap>
            <div class="afPlayer__progressTrack">
              <span class="afPlayer__buffer" data-buffer-bar></span>
              <span class="afPlayer__progress" data-progress-bar></span>
              <input class="afPlayer__range" data-progress-range type="range" min="0" max="1000" value="0" aria-label="Video progress" />
            </div>
            <span class="afPlayer__tooltip" data-time-tooltip>0:00</span>
          </div>

          <div class="afPlayer__bar">
            <div class="afPlayer__cluster">
              <button class="afPlayer__btn" type="button" data-play-toggle aria-label="Play">${icon("play")}</button>
              <button class="afPlayer__btn" type="button" data-skip="-10" aria-label="Back 10 seconds">${icon("rewind")}</button>
              <button class="afPlayer__btn" type="button" data-skip="10" aria-label="Forward 10 seconds">${icon("forward")}</button>
              <span class="afPlayer__time" data-time-label>0:00 / 0:00</span>
            </div>

            <div class="afPlayer__cluster afPlayer__cluster--right">
              <button class="afPlayer__btn" type="button" data-mute-toggle aria-label="Mute">${icon("volume")}</button>
              <input class="afPlayer__volume" data-volume-range type="range" min="0" max="1" step="0.01" value="1" aria-label="Volume" />

              <div class="afPlayer__menuWrap">
                <button class="afPlayer__textBtn" type="button" data-speed-toggle>Normal</button>
                <div class="afPlayer__menu" data-speed-menu hidden>
                  ${SPEEDS.map((speed) => `<button type="button" data-speed="${speed}">${speedLabel(speed)}</button>`).join("")}
                </div>
              </div>

              <div class="afPlayer__menuWrap">
                <button class="afPlayer__textBtn" type="button" data-quality-toggle>Auto</button>
                <div class="afPlayer__menu" data-quality-menu hidden>
                  ${QUALITIES.map((quality) => `<button type="button" data-quality="${quality}">${quality}</button>`).join("")}
                </div>
              </div>

              <button class="afPlayer__btn" type="button" data-fullscreen-toggle aria-label="Fullscreen">${icon("fullscreen")}</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const player = host.querySelector("[data-player]");
    const stage = host.querySelector("[data-stage]");
    const video = host.querySelector("[data-video]");
    const playButton = host.querySelector("[data-play-toggle]");
    const muteButton = host.querySelector("[data-mute-toggle]");
    const fullscreenButton = host.querySelector("[data-fullscreen-toggle]");
    const progressRange = host.querySelector("[data-progress-range]");
    const volumeRange = host.querySelector("[data-volume-range]");
    const progressWrap = host.querySelector("[data-progress-wrap]");
    const progressBar = host.querySelector("[data-progress-bar]");
    const bufferBar = host.querySelector("[data-buffer-bar]");
    const tooltip = host.querySelector("[data-time-tooltip]");
    const timeLabel = host.querySelector("[data-time-label]");
    const centerIcon = host.querySelector("[data-center-icon]");
    const holdIndicator = host.querySelector("[data-hold-indicator]");
    const leftSkip = host.querySelector("[data-skip-left]");
    const rightSkip = host.querySelector("[data-skip-right]");
    const speedButton = host.querySelector("[data-speed-toggle]");
    const speedMenu = host.querySelector("[data-speed-menu]");
    const qualityButton = host.querySelector("[data-quality-toggle]");
    const qualityMenu = host.querySelector("[data-quality-menu]");

    if (poster) video.poster = poster;
    video.src = source;
    video.volume = 1;

    let selectedSpeed = 1;
    let holdSpeed = null;
    let holdTimer = 0;
    let hideTimer = 0;
    let centerTimer = 0;
    let skipTimer = 0;
    let clickTimer = 0;
    let lastTapAt = 0;
    let draggingProgress = false;
    const listeners = [];

    function on(target, eventName, handler, optionsArg) {
      target.addEventListener(eventName, handler, optionsArg);
      listeners.push(() => target.removeEventListener(eventName, handler, optionsArg));
    }

    function togglePlay() {
      if (video.paused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }

    function updatePlayState({ announce = true } = {}) {
      const playing = !video.paused;
      playButton.innerHTML = icon(playing ? "pause" : "play");
      playButton.setAttribute("aria-label", playing ? "Pause" : "Play");
      if (announce) showCenterIcon(playing ? "play" : "pause");
    }

    function showCenterIcon(name) {
      window.clearTimeout(centerTimer);
      centerIcon.innerHTML = icon(name);
      centerIcon.classList.remove("is-visible");
      void centerIcon.offsetWidth;
      centerIcon.classList.add("is-visible");
      centerTimer = window.setTimeout(() => centerIcon.classList.remove("is-visible"), 600);
    }

    function skip(seconds) {
      if (!Number.isFinite(video.duration)) return;
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
      const indicator = seconds < 0 ? leftSkip : rightSkip;
      window.clearTimeout(skipTimer);
      indicator.classList.remove("is-visible");
      void indicator.offsetWidth;
      indicator.classList.add("is-visible");
      skipTimer = window.setTimeout(() => indicator.classList.remove("is-visible"), 620);
      updateProgress();
    }

    function updateProgress() {
      const duration = Number(video.duration) || 0;
      const current = Number(video.currentTime) || 0;
      const progress = duration ? (current / duration) * 100 : 0;
      progressBar.style.width = `${progress}%`;
      progressRange.value = duration ? String(Math.round((current / duration) * 1000)) : "0";
      timeLabel.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    }

    function updateBuffer() {
      const duration = Number(video.duration) || 0;
      if (!duration || !video.buffered.length) {
        bufferBar.style.width = "0%";
        return;
      }
      const end = video.buffered.end(video.buffered.length - 1);
      bufferBar.style.width = `${Math.min(100, (end / duration) * 100)}%`;
    }

    function seekFromRange() {
      const duration = Number(video.duration) || 0;
      if (!duration) return;
      video.currentTime = (Number(progressRange.value) / 1000) * duration;
      updateProgress();
    }

    function setPreviewTime(clientX) {
      const rect = progressWrap.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const duration = Number(video.duration) || 0;
      tooltip.textContent = formatTime(duration * ratio);
      tooltip.style.left = `${ratio * 100}%`;
    }

    function setMuted(muted) {
      if (!muted && video.volume === 0) video.volume = 0.7;
      video.muted = muted;
      updateVolumeState();
    }

    function updateVolumeState() {
      const muted = video.muted || video.volume === 0;
      muteButton.innerHTML = icon(muted ? "mute" : "volume");
      muteButton.setAttribute("aria-label", muted ? "Unmute" : "Mute");
      volumeRange.value = muted ? "0" : String(video.volume);
    }

    function setSpeed(speed, { temporary = false } = {}) {
      const nextSpeed = Number(speed);
      if (!SPEEDS.includes(nextSpeed)) return;
      video.playbackRate = nextSpeed;
      if (!temporary) selectedSpeed = nextSpeed;
      speedButton.textContent = speedLabel(nextSpeed);
      speedMenu.querySelectorAll("[data-speed]").forEach((button) => {
        button.classList.toggle("is-active", Number(button.getAttribute("data-speed")) === selectedSpeed);
      });
    }

    function stepSpeed(direction) {
      const currentIndex = SPEEDS.indexOf(selectedSpeed);
      const nextIndex = Math.max(0, Math.min(SPEEDS.length - 1, currentIndex + direction));
      setSpeed(SPEEDS[nextIndex]);
    }

    function setQuality(label) {
      const quality = QUALITIES.includes(label) ? label : "Auto";
      qualityButton.textContent = quality;
      qualityMenu.querySelectorAll("[data-quality]").forEach((button) => {
        button.classList.toggle("is-active", button.getAttribute("data-quality") === quality);
      });
      // HLS-ready: replace video.src or hls.js level here when real renditions are available.
    }

    function closeMenus() {
      speedMenu.hidden = true;
      qualityMenu.hidden = true;
    }

    function toggleFullscreen() {
      if (document.fullscreenElement === player) {
        document.exitFullscreen?.();
        return;
      }
      player.requestFullscreen?.();
    }

    function updateFullscreenState() {
      const active = document.fullscreenElement === player;
      fullscreenButton.innerHTML = icon(active ? "exitFullscreen" : "fullscreen");
      fullscreenButton.setAttribute("aria-label", active ? "Exit fullscreen" : "Fullscreen");
      player.classList.toggle("is-fullscreen", active);
      revealControls();
    }

    function revealControls() {
      player.classList.remove("is-idle");
      window.clearTimeout(hideTimer);
      if (document.fullscreenElement !== player) return;
      hideTimer = window.setTimeout(() => player.classList.add("is-idle"), 3000);
    }

    function startHoldSpeed() {
      holdSpeed = video.playbackRate;
      setSpeed(2, { temporary: true });
      holdIndicator.classList.add("is-visible");
    }

    function stopHoldSpeed() {
      window.clearTimeout(holdTimer);
      if (holdSpeed !== null) {
        video.playbackRate = holdSpeed;
        speedButton.textContent = speedLabel(selectedSpeed);
        holdSpeed = null;
      }
      holdIndicator.classList.remove("is-visible");
    }

    function handleStagePointerUp(event) {
      window.clearTimeout(holdTimer);
      if (holdSpeed !== null) {
        stopHoldSpeed();
        return;
      }

      const now = Date.now();
      const rect = stage.getBoundingClientRect();
      const side = event.clientX < rect.left + rect.width / 2 ? -1 : 1;

      if (now - lastTapAt <= 280) {
        window.clearTimeout(clickTimer);
        lastTapAt = 0;
        skip(side * 10);
        return;
      }

      lastTapAt = now;
      clickTimer = window.setTimeout(() => {
        togglePlay();
        lastTapAt = 0;
      }, 230);
    }

    function handleKeyboard(event) {
      if (document.getElementById("viewDetails")?.hidden) return;
      const tagName = String(document.activeElement?.tagName || "").toLowerCase();
      if (["input", "select", "textarea", "button"].includes(tagName) && event.key === " ") return;

      if (event.key === " ") {
        event.preventDefault();
        togglePlay();
      } else if (event.key.toLowerCase() === "m") {
        setMuted(!video.muted && video.volume > 0);
      } else if (event.key.toLowerCase() === "f") {
        toggleFullscreen();
      } else if (event.key === "<" || event.key === ",") {
        stepSpeed(-1);
      } else if (event.key === ">" || event.key === ".") {
        stepSpeed(1);
      }
      revealControls();
    }

    on(playButton, "click", togglePlay);
    on(video, "play", updatePlayState);
    on(video, "pause", updatePlayState);
    on(video, "loadedmetadata", () => {
      updateProgress();
      updateBuffer();
    });
    on(video, "durationchange", updateProgress);
    on(video, "timeupdate", () => {
      if (!draggingProgress) updateProgress();
    });
    on(video, "progress", updateBuffer);
    on(video, "volumechange", updateVolumeState);
    on(video, "waiting", () => player.classList.add("is-buffering"));
    on(video, "playing", () => player.classList.remove("is-buffering"));

    on(stage, "pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      revealControls();
      holdTimer = window.setTimeout(startHoldSpeed, 430);
    });
    on(stage, "pointerup", handleStagePointerUp);
    on(stage, "pointerleave", stopHoldSpeed);
    on(stage, "pointercancel", stopHoldSpeed);

    on(progressRange, "input", () => {
      draggingProgress = true;
      seekFromRange();
    });
    on(progressRange, "change", () => {
      seekFromRange();
      draggingProgress = false;
    });
    on(progressWrap, "pointermove", (event) => {
      setPreviewTime(event.clientX);
      tooltip.classList.add("is-visible");
    });
    on(progressWrap, "pointerleave", () => tooltip.classList.remove("is-visible"));

    on(volumeRange, "input", () => {
      video.volume = Number(volumeRange.value);
      video.muted = Number(volumeRange.value) === 0;
      updateVolumeState();
    });
    on(muteButton, "click", () => setMuted(!video.muted && video.volume > 0));

    on(host, "click", (event) => {
      const skipButton = event.target.closest("[data-skip]");
      const speedChoice = event.target.closest("[data-speed]");
      const qualityChoice = event.target.closest("[data-quality]");

      if (skipButton) {
        skip(Number(skipButton.getAttribute("data-skip")));
        return;
      }

      if (event.target.closest("[data-speed-toggle]")) {
        speedMenu.hidden = !speedMenu.hidden;
        qualityMenu.hidden = true;
        return;
      }

      if (event.target.closest("[data-quality-toggle]")) {
        qualityMenu.hidden = !qualityMenu.hidden;
        speedMenu.hidden = true;
        return;
      }

      if (speedChoice) {
        setSpeed(Number(speedChoice.getAttribute("data-speed")));
        closeMenus();
        return;
      }

      if (qualityChoice) {
        setQuality(qualityChoice.getAttribute("data-quality"));
        closeMenus();
      }
    });

    on(fullscreenButton, "click", toggleFullscreen);
    on(document, "fullscreenchange", updateFullscreenState);
    on(document, "keydown", handleKeyboard);
    on(document, "click", (event) => {
      if (!host.contains(event.target)) closeMenus();
    });
    on(player, "mousemove", revealControls);
    on(player, "pointermove", revealControls);

    setSpeed(1);
    setQuality("Auto");
    updateVolumeState();
    updatePlayState({ announce: false });

    cleanupActivePlayer = () => {
      listeners.splice(0).forEach((remove) => remove());
      window.clearTimeout(holdTimer);
      window.clearTimeout(hideTimer);
      window.clearTimeout(centerTimer);
      window.clearTimeout(skipTimer);
      window.clearTimeout(clickTimer);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    return { video, destroy: destroyActivePlayer };
  }

  function destroyActivePlayer() {
    if (typeof cleanupActivePlayer === "function") {
      cleanupActivePlayer();
      cleanupActivePlayer = null;
    }
  }

  app.mountHtml5Player = mountHtml5Player;
  app.destroyActivePlayer = destroyActivePlayer;
})();
