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
let idleTimeline = null;

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
      console.log("Fehler beim Laden von gong.mp3.");
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
  if (!startHour || !startMinute || !endHour || !endMinute) return null;
  if (!startHour.value || !startMinute.value || !endHour.value || !endMinute.value) return null;

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


/* =========================
STICKY NOTE – HELPERS
========================= */

function getStickyTape() {
  if (!stickyNote) return null;
  return stickyNote.querySelector("#kelbestreifen");
}

function getStickyBaseRotation() {
  if (!stickyNote) return -7;
  // Im Break-Screen: -5deg (aus CSS), sonst -7deg
  return stickyNote.closest("#break-screen") ? -5 : -7;
}


/* =========================
STICKY NOTE – IDLE MOTION
========================= */

let idleTimeline = null;

function startStickyIdleMotion() {
  if (!stickyNote || !window.gsap) return;

  const base = getStickyBaseRotation();

  if (idleTimeline) {
    idleTimeline.kill();
    idleTimeline = null;
  }

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


/* =========================
STICKY NOTE – PLACE ANIMATION
========================= */

function playStickyPlaceAnimation() {
  if (!stickyNote || !window.gsap) return;

  const base = getStickyBaseRotation();
  const tape = getStickyTape();

  stopStickyIdleMotion();

  gsap.set(stickyNote, {
    x: "120vw",
    y: -8,
    opacity: 1,
    scale: 1.03,
    rotation: base + 10,
    transformOrigin: "50% 8%"
  });

  if (tape) {
    gsap.set(tape, { transformOrigin: "50% 0%", scaleY: 1 });
  }

  const tl = gsap.timeline({
    onComplete: () => startStickyIdleMotion()
  });

  // Phase 1: Eingleiten von rechts
  tl.to(stickyNote, {
    x: 0,
    rotation: base,
    scale: 1,
    duration: 0.72,
    ease: "back.out(1.05)"
  });

  // Phase 2: Aufsetzen – Druck-Illusion
  tl.to(stickyNote, {
    y: 5,
    scaleY: 0.965,
    scaleX: 1.012,
    duration: 0.13,
    ease: "power2.out"
  }, "-=0.18");

  if (tape) {
    tl.to(tape, {
      scaleY: 0.82,
      duration: 0.13,
      ease: "power2.out"
    }, "<");
  }

  // Phase 3: Rebound – weiches Ausfedern
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


/* =========================
STICKY NOTE – PEEL OUT ANIMATION
========================= */

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
        gsap.set(stickyNote, { clearProps: "all" });
        resolve();
      }
    });

    // Phase 1: Zögern – als würde eine Hand danach greifen
    tl.to(stickyNote, {
      scale: 0.97,
      rotation: base - 3,
      y: -3,
      duration: 0.25,
      ease: "power1.inOut"
    });

    // Phase 2: Tape löst sich
    if (tape) {
      tl.to(tape, {
        scaleY: 1.15,
        opacity: 0.7,
        duration: 0.2,
        ease: "power1.in"
      }, "-=0.1");
    }

    // Phase 3: Papier gleitet nach rechts heraus
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


/* =========================
STICKY NOTE – STATE & PLACEMENT
========================= */

function placeStickyNote(target) {
  if (!stickyNote) return;

  // Exakte Container-IDs statt generischer Klassen –
  // verhindert dass der falsche .screen__inner erwischt wird
  const containers = {
    "transition": "#transition-screen .screen__inner",
    "break": "#break-screen .break-layout"
  };

  const selector = containers[target];
  if (!selector) return;

  const parent = document.querySelector(selector);
  if (!parent) {
    console.warn(`placeStickyNote: Container "${selector}" nicht gefunden.`);
    return;
  }

  if (stickyNote.parentElement !== parent) {
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

  stickyNote.querySelectorAll(".sticky-note__state").forEach((el) => {
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
  if (breakInterval)   { clearInterval(breakInterval);   breakInterval = null;   }
  if (endingTimeout)   { clearTimeout(endingTimeout);    endingTimeout = null;   }
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

  // Screen zuerst einblenden
  showScreen("transition");

  // Nach einem RAF sicherstellen dass der Screen im DOM aktiv ist,
  // bevor das Sticky Note hineinbewegt und animiert wird
  requestAnimationFrame(() => {
    placeStickyNote("transition");
    setStickyState("planned");

    if (nextBreakTime) nextBreakTime.textContent = activeStartTime;

    showStickyNote();
  });
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

  requestAnimationFrame(() => {
    placeStickyNote("break");
    setStickyState("break");
    showStickyNote({ animate: false });
  });

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

  // Gong klingt aus → done-State einblenden → Sticky Note abziehen → Reset
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

  if (startHour)   startHour.value   = "";
  if (startMinute) startMinute.value = "";
  if (endHour)     endHour.value     = "";
  if (endMinute)   endMinute.value   = "";

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
