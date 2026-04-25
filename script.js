/* =========================
DOM ELEMENTS
========================= */

const startScreen = document.getElementById("start-screen");
const transitionScreen = document.getElementById("transition-screen");
const breakScreen = document.getElementById("break-screen");

const timeForm = document.getElementById("time-form");
const startHour = document.getElementById("start-hour");
const startMinute = document.getElementById("start-minute");
const endHour = document.getElementById("end-hour");
const endMinute = document.getElementById("end-minute");

const stickyNote = document.querySelector(".sticky-note");
const stickyStates = document.querySelectorAll(".sticky-note__state");
const prepConfirmButton = document.getElementById("prep-confirm-button");
const nextBreakTime = document.getElementById("next-break-time");

const timer = document.getElementById("timer");

const flipMinTens = document.getElementById("flip-min-tens");
const flipMinOnes = document.getElementById("flip-min-ones");
const flipSecTens = document.getElementById("flip-sec-tens");
const flipSecOnes = document.getElementById("flip-sec-ones");

const gongSound = document.getElementById("gong-sound");


/* =========================
APP STATE
========================= */

let appState = "idle";
// idle | planned | waiting | break | done

let activeStartTime = null;
let activeEndTime = null;

let waitingInterval = null;
let breakInterval = null;
let endingTimeout = null;

let soundUnlocked = false;
let startGongPlayed = false;
let endGongPlayed = false;
let endingSequenceRunning = false;


/* =========================
INIT
========================= */

init();

function init() {
  fillTimeOptions();
  updateFlipClock(0);
  applyTimeTheme();
  showScreen("start");
  hideStickyNote();

  if (timeForm) {
    timeForm.addEventListener("submit", handleTimeSubmit);
  }

  if (prepConfirmButton) {
    prepConfirmButton.addEventListener("click", handlePrepConfirm);
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) syncAppState();
  });

  window.addEventListener("focus", syncAppState);

  if (gongSound) {
    gongSound.addEventListener("error", () => {
      console.log("Fehler beim Laden von gong.mp3. Prüfe Dateiname und Speicherort.");
    });
  }
}


/* =========================
THEME
========================= */

function applyTimeTheme() {
  const hour = new Date().getHours();

  document.body.classList.remove("morning", "day", "night");

  if (hour >= 6 && hour < 11) {
    document.body.classList.add("morning");
  } else if (hour >= 11 && hour < 20) {
    document.body.classList.add("day");
  } else {
    document.body.classList.add("night");
  }
}


/* =========================
TIME SELECTS
========================= */

function fillTimeOptions() {
  for (let i = 0; i < 24; i++) {
    const hour = String(i).padStart(2, "0");
    if (startHour) startHour.innerHTML += `<option value="${hour}">${hour}</option>`;
    if (endHour) endHour.innerHTML += `<option value="${hour}">${hour}</option>`;
  }

  for (let i = 0; i < 60; i++) {
    const minute = String(i).padStart(2, "0");
    if (startMinute) startMinute.innerHTML += `<option value="${minute}">${minute}</option>`;
    if (endMinute) endMinute.innerHTML += `<option value="${minute}">${minute}</option>`;
  }
}


/* =========================
TIME HELPERS
========================= */

function getTodayDateForTime(timeString) {
  const [hours, minutes] = timeString.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function getSelectedTimes() {
  if (!startHour.value || !startMinute.value || !endHour.value || !endMinute.value) {
    return null;
  }
  return {
    startTime: `${startHour.value}:${startMinute.value}`,
    endTime: `${endHour.value}:${endMinute.value}`,
  };
}

function validatePauseTimes(startTime, endTime) {
  const now = new Date();
  const startDate = getTodayDateForTime(startTime);
  const endDate = getTodayDateForTime(endTime);

  if (endDate <= startDate) {
    return { valid: false, reason: "Die Endzeit muss nach der Startzeit liegen 💛" };
  }
  if (endDate <= now) {
    return { valid: false, reason: "Diese Pause ist heute leider schon vorbei 💛" };
  }
  if (startDate <= now && endDate > now) {
    return { valid: true, mode: "start-break-now" };
  }
  if (startDate > now && endDate > now) {
    return { valid: true, mode: "wait-for-break" };
  }
  return { valid: false, reason: "Bitte überprüfe deine Zeiten nochmal 💛" };
}


/* =========================
SCREEN HELPERS
========================= */

function showScreen(screenName) {
  if (!startScreen || !transitionScreen || !breakScreen) return;

  startScreen.classList.remove("is-active");
  transitionScreen.classList.remove("is-active");
  breakScreen.classList.remove("is-active");

  if (screenName === "start") startScreen.classList.add("is-active");
  if (screenName === "transition") transitionScreen.classList.add("is-active");
  if (screenName === "break") breakScreen.classList.add("is-active");
}


/* =============================================================
   STICKY NOTE SYSTEM
   ============================================================= */

// Das Tape-Element hat im SVG die ID "kelbestreifen"
function getStickyTape() {
  if (!stickyNote) return null;
  return stickyNote.querySelector("#kelbestreifen");
}

// Basis-Rotation aus dem CSS:
// Standard-Screen: -7deg, Break-Screen: -5deg
function getStickyBaseRotation() {
  if (!stickyNote) return -7;
  return stickyNote.closest(".screen--break") ? -5 : -7;
}


/* --- IDLE MOTION --- */

let idleTimeline = null;

function startStickyIdleMotion() {
  if (!stickyNote || !window.gsap) return;

  const base = getStickyBaseRotation();

  if (idleTimeline) {
    idleTimeline.kill();
    idleTimeline = null;
  }

  // Vier sanft ineinandergreifende Phasen – wie eine leichte Brise.
  // Alle Bewegungen relativ zur aktuellen Position (+=), damit kein
  // harter Sprung entsteht egal wann die Idle-Motion startet.
  idleTimeline = gsap.timeline({ repeat: -1 });

  idleTimeline
    .to(stickyNote, {
      y: "+=4",
      rotation: base + 0.6,
      duration: 3.8,
      ease: "sine.inOut"
    })
    .to(stickyNote, {
      y: "-=2",
      rotation: base - 0.4,
      duration: 2.9,
      ease: "sine.inOut"
    })
    .to(stickyNote, {
      y: "+=1",
      x: "+=1.5",
      rotation: base + 0.2,
      duration: 3.2,
      ease: "sine.inOut"
    })
    .to(stickyNote, {
      y: "-=3",
      x: "-=1.5",
      rotation: base,
      duration: 3.5,
      ease: "sine.inOut"
    });
}

function stopStickyIdleMotion() {
  if (idleTimeline) {
    idleTimeline.kill();
    idleTimeline = null;
  }
  if (stickyNote && window.gsap) {
    gsap.killTweensOf(stickyNote);
  }
}


/* --- PLACE ANIMATION --- */

function playStickyPlaceAnimation() {
  if (!stickyNote || !window.gsap) return;

  const base = getStickyBaseRotation();
  const tape = getStickyTape();

  stopStickyIdleMotion();

  // Startposition: rechts außerhalb des Viewports.
  // transformOrigin auf ~8% von oben = ungefähr die Tape-Zone des SVG
  // (Tape geht von y=74 bis y=520 bei einer Gesamthöhe von 2515 → ~17%,
  // Mittelpunkt bei ~8%). Das sorgt dafür, dass die Rotation
  // realistisch um den Aufhängepunkt dreht.
  gsap.set(stickyNote, {
    x: "120vw",
    y: -8,
    opacity: 1,
    scale: 1.03,
    rotation: base + 10,
    transformOrigin: "50% 8%"
  });

  if (tape) {
    gsap.set(tape, {
      transformOrigin: "50% 0%",
      scaleY: 1
    });
  }

  const tl = gsap.timeline({
    onComplete: () => startStickyIdleMotion()
  });

  // ── Phase 1: Eingleiten ──────────────────────────────────────
  // Das Papier kommt von rechts, leicht angewinkelt.
  // back.out(1.05): minimaler Overshoot – physisch, nicht cartoonhaft.
  tl.to(stickyNote, {
    x: 0,
    rotation: base,
    scale: 1,
    duration: 0.72,
    ease: "back.out(1.05)"
  });

  // ── Phase 2: Aufsetzen ───────────────────────────────────────
  // Kurz vor Ende des Slides berührt das Papier die Fläche:
  // minimale Y-Stauchung + leichte X-Spreizung = Druck-Illusion.
  // Startet 180ms vor Ende von Phase 1 (überlappend = flüssig).
  tl.to(stickyNote, {
    y: 5,
    scaleY: 0.965,
    scaleX: 1.012,
    duration: 0.13,
    ease: "power2.out"
  }, "-=0.18");

  // Tape wird gleichzeitig leicht zusammengedrückt
  if (tape) {
    tl.to(tape, {
      scaleY: 0.82,
      duration: 0.13,
      ease: "power2.out"
    }, "<");
  }

  // ── Phase 3: Rebound ─────────────────────────────────────────
  // Das Papier federt organisch aus.
  // elastic.out(1.1, 0.55): weiches Federn, kein übertriebenes Wippen.
  tl.to(stickyNote, {
    y: 0,
    scaleY: 1,
    scaleX: 1,
    duration: 0.55,
    ease: "elastic.out(1.1, 0.55)"
  });

  if (tape) {
    tl.to(tape, {
      scaleY: 1,
      duration: 0.45,
      ease: "elastic.out(1.1, 0.55)"
    }, "<");
  }
}


/* --- PEEL OUT ANIMATION --- */

function playStickyPeelOutAnimation() {
  if (!stickyNote || !window.gsap) {
    hideStickyNote();
    return Promise.resolve();
  }

  const base = getStickyBaseRotation();
  const tape = getStickyTape();

  stopStickyIdleMotion();

  return new Promise((resolve) => {
    const tl = gsap.timeline({
      onComplete: () => {
        hideStickyNote();
        // Alle GSAP-Props zurücksetzen damit nächste Nutzung sauber startet
        gsap.set(stickyNote, { clearProps: "all" });
        resolve();
      }
    });

    // ── Phase 1: Zögern / Greifen ────────────────────────────────
    // Kurze Gegenbewegung – als würde eine Hand nach dem Zettel greifen.
    // Subtile Spannung bevor das Papier losgelassen wird.
    tl.to(stickyNote, {
      scale: 0.97,
      rotation: base - 3,
      y: -3,
      duration: 0.25,
      ease: "power1.inOut"
    });

    // ── Phase 2: Tape löst sich ──────────────────────────────────
    // Der Klebestreifen wird leicht gestreckt bevor das Papier abgeht –
    // simuliert das echte Ablösen von einer Oberfläche.
    if (tape) {
      tl.to(tape, {
        scaleY: 1.15,
        opacity: 0.7,
        duration: 0.2,
        ease: "power1.in"
      }, "-=0.1");
    }

    // ── Phase 3: Abgleiten nach rechts ──────────────────────────
    // Rotation steigt (Papier wird von oben-rechts weggezogen),
    // leichte Skalierung nach unten (Perspektive/Distanz).
    // Opacity fällt erst ganz am Ende ab – das Papier bleibt
    // sichtbar bis es wirklich außerhalb ist.
    tl.to(stickyNote, {
      x: "115vw",
      y: -40,
      rotation: base + 18,
      scale: 0.96,
      duration: 0.85,
      ease: "power2.in"
    });

    tl.to(stickyNote, {
      opacity: 0,
      duration: 0.25,
      ease: "power1.in"
    }, "-=0.28");

    if (tape) {
      tl.to(tape, {
        scaleY: 1,
        opacity: 0,
        duration: 0.3,
        ease: "power1.in"
      }, "<");
    }
  });
}


/* --- STATE & PLACEMENT --- */

function placeStickyNote(target) {
  if (!stickyNote) return;

  const containers = {
    "transition": ".screen__inner",
    "break": ".break-layout"
  };

  const selector = containers[target];
  if (!selector) return;

  const parent = document.querySelector(selector);
  if (parent && stickyNote.parentElement !== parent) {
    parent.appendChild(stickyNote);
  }
}

function showStickyNote(options = {}) {
  if (!stickyNote) return;
  const { animate = true } = options;

  stickyNote.classList.remove("is-hidden");

  if (animate && window.gsap) {
    playStickyPlaceAnimation();
  } else {
    // Kein animate (z.B. direkt in Break): sauber positionieren
    // und Idle starten ohne Einflug-Animation
    gsap.set(stickyNote, {
      x: 0,
      y: 0,
      opacity: 1,
      scale: 1,
      rotation: getStickyBaseRotation(),
      transformOrigin: "50% 8%",
      clearProps: "scaleX,scaleY"
    });
    startStickyIdleMotion();
  }
}

function hideStickyNote() {
  if (!stickyNote) return;
  stickyNote.classList.add("is-hidden");
  stopStickyIdleMotion();
}

function setStickyState(state) {
  if (!stickyNote) return;
  stickyNote.dataset.state = state;

  const states = stickyNote.querySelectorAll(".sticky-note__state");
  states.forEach((el) => {
    const isActive = el.dataset.stickyState === state;
    el.classList.toggle("is-active", isActive);
    if (isActive) el.style.opacity = "1";
  });
}

function changeStickyStateWithFade(state) {
  if (!stickyNote || !window.gsap) {
    setStickyState(state);
    return;
  }

  const current = stickyNote.querySelector(".sticky-note__state.is-active");
  if (!current) {
    setStickyState(state);
    return;
  }

  gsap.to(current, {
    opacity: 0,
    y: -5,
    duration: 0.22,
    ease: "power1.in",
    onComplete: () => {
      setStickyState(state);
      const next = stickyNote.querySelector(".sticky-note__state.is-active");
      if (next) {
        gsap.fromTo(
          next,
          { opacity: 0, y: 6 },
          { opacity: 1, y: 0, duration: 0.32, ease: "power2.out" }
        );
      }
    }
  });
}


/* =========================
FLIP CLOCK
========================= */

function updateFlipClock(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  const minString = String(minutes).padStart(2, "0");
  const secString = String(seconds).padStart(2, "0");

  if (flipMinTens) flipMinTens.textContent = minString[0];
  if (flipMinOnes) flipMinOnes.textContent = minString[1];
  if (flipSecTens) flipSecTens.textContent = secString[0];
  if (flipSecOnes) flipSecOnes.textContent = secString[1];

  if (timer) timer.textContent = `${minString}:${secString}`;
}


/* =========================
AUDIO / NOTIFICATIONS
========================= */

async function unlockSound() {
  if (soundUnlocked || !gongSound) return true;

  try {
    gongSound.muted = true;
    gongSound.currentTime = 0;

    const playPromise = gongSound.play();
    if (playPromise !== undefined) await playPromise;

    gongSound.pause();
    gongSound.currentTime = 0;
    gongSound.muted = false;

    soundUnlocked = true;
    return true;
  } catch (error) {
    gongSound.muted = false;
    console.log("Sound konnte nicht freigeschaltet werden:", error);
    return false;
  }
}

function playGong() {
  if (!gongSound) return;

  try {
    const gong = gongSound.cloneNode();
    gong.volume = 0;
    gong.currentTime = 0;

    const playPromise = gong.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => fadeGong(gong))
        .catch((error) => console.log("Gong Fehler:", error));
    }
  } catch (error) {
    console.log("Gong konnte nicht abgespielt werden:", error);
  }
}

function fadeGong(gong) {
  let volume = 0;

  const fadeIn = setInterval(() => {
    volume += 0.04;
    if (volume >= 0.75) {
      gong.volume = 0.75;
      clearInterval(fadeIn);
    } else {
      gong.volume = volume;
    }
  }, 40);

  setTimeout(() => {
    let fadeOutVolume = gong.volume;
    const fadeOut = setInterval(() => {
      fadeOutVolume -= 0.02;
      if (fadeOutVolume <= 0) {
        gong.volume = 0;
        clearInterval(fadeOut);
      } else {
        gong.volume = fadeOutVolume;
      }
    }, 60);
  }, 3000);
}

async function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch (error) {
      console.log("Notification permission fehlgeschlagen:", error);
    }
  }
}

function showNotification(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body });
    } catch (error) {
      console.log("Notification konnte nicht angezeigt werden:", error);
    }
  }
}


/* =========================
TIMER HELPERS
========================= */

function clearAllTimers() {
  if (waitingInterval) { clearInterval(waitingInterval); waitingInterval = null; }
  if (breakInterval) { clearInterval(breakInterval); breakInterval = null; }
  if (endingTimeout) { clearTimeout(endingTimeout); endingTimeout = null; }
}


/* =========================
FLOW
========================= */

async function handleTimeSubmit(event) {
  event.preventDefault();

  await unlockSound();
  await requestNotificationPermission();

  const selectedTimes = getSelectedTimes();

  if (!selectedTimes) {
    alert("Bitte beide Zeiten vollständig eingeben 🥺");
    return;
  }

  const { startTime, endTime } = selectedTimes;
  const validation = validatePauseTimes(startTime, endTime);

  if (!validation.valid) {
    alert(validation.reason);
    return;
  }

  activeStartTime = startTime;
  activeEndTime = endTime;

  startGongPlayed = false;
  endGongPlayed = false;
  endingSequenceRunning = false;

  if (validation.mode === "start-break-now") {
    await startBreakPhase(true);
    return;
  }

  if (validation.mode === "wait-for-break") {
    startTransitionPhase();
  }
}

function startTransitionPhase() {
  clearAllTimers();

  appState = "planned";

  showScreen("transition");
  placeStickyNote("transition");
  setStickyState("planned");

  if (nextBreakTime) nextBreakTime.textContent = activeStartTime;

  showStickyNote();
}

function handlePrepConfirm() {
  if (appState !== "planned") return;

  appState = "waiting";

  changeStickyStateWithFade("waiting");

  const startDate = getTodayDateForTime(activeStartTime);
  const endDate = getTodayDateForTime(activeEndTime);

  waitingInterval = setInterval(async () => {
    const now = new Date();

    if (now >= endDate) {
      resetApp();
      return;
    }

    if (now >= startDate && now < endDate) {
      clearAllTimers();
      await startBreakPhase(true);
    }
  }, 500);
}

async function startBreakPhase(playStartGong = true) {
  clearAllTimers();

  appState = "break";

  showScreen("break");
  placeStickyNote("break");
  setStickyState("break");
  showStickyNote({ animate: false });

  if (playStartGong && !startGongPlayed) {
    playGong();
    showNotification("Pause 💛", "Zeit für deine Pause 🌿");
    startGongPlayed = true;
  }

  const endDate = getTodayDateForTime(activeEndTime);

  function renderRemainingTime() {
    if (appState !== "break") return;

    const now = new Date();
    const remainingSeconds = Math.max(0, Math.floor((endDate - now) / 1000));

    updateFlipClock(remainingSeconds);

    if (remainingSeconds <= 0) triggerBreakEnd();
  }

  renderRemainingTime();
  breakInterval = setInterval(renderRemainingTime, 250);
}

function triggerBreakEnd() {
  if (endingSequenceRunning) return;

  endingSequenceRunning = true;
  appState = "done";

  clearAllTimers();
  updateFlipClock(0);

  if (!endGongPlayed) {
    playGong();
    showNotification("Pause vorbei ✨", "Deine Pause ist jetzt vorbei.");
    endGongPlayed = true;
  }

  // Gong klingt → 5s warten → "done"-State einblenden →
  // 4.5s lesen → Sticky Note gleitet heraus → Reset
  endingTimeout = setTimeout(() => {
    changeStickyStateWithFade("done");
    endingTimeout = setTimeout(async () => {
      await playStickyPeelOutAnimation();
      resetApp();
    }, 4500);
  }, 5000);
}

function resetApp() {
  clearAllTimers();

  appState = "idle";
  activeStartTime = null;
  activeEndTime = null;

  startGongPlayed = false;
  endGongPlayed = false;
  endingSequenceRunning = false;

  if (startHour) startHour.value = "";
  if (startMinute) startMinute.value = "";
  if (endHour) endHour.value = "";
  if (endMinute) endMinute.value = "";

  updateFlipClock(0);
  setStickyState("planned");
  hideStickyNote();
  showScreen("start");
}


/* =========================
RESYNC
========================= */

function syncAppState() {
  if (!activeStartTime || !activeEndTime) return;
  if (appState === "idle" || appState === "planned" || appState === "done") return;

  const now = new Date();
  const startDate = getTodayDateForTime(activeStartTime);
  const endDate = getTodayDateForTime(activeEndTime);

  if (now >= endDate) {
    triggerBreakEnd();
    return;
  }

  if (now >= startDate && now < endDate && appState === "waiting") {
    startBreakPhase(true);
  }

  if (appState === "break") {
    const remainingSeconds = Math.max(0, Math.floor((endDate - now) / 1000));
    updateFlipClock(remainingSeconds);
  }
}
