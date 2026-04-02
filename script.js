const startButton = document.getElementById("start-button");

const setupScreen = document.getElementById("setup-screen");
const transitionScreen = document.getElementById("transition-screen");
const breakScreen = document.getElementById("break-screen");

const startHour = document.getElementById("start-hour");
const startMinute = document.getElementById("start-minute");
const endHour = document.getElementById("end-hour");
const endMinute = document.getElementById("end-minute");

const prepOverlay = document.getElementById("prepOverlay");
const prepNoteSheet = document.getElementById("prepNoteSheet");
const prepFlightShadow = document.getElementById("prepFlightShadow");
const prepNoteContent = document.getElementById("prepNoteContent");
const prepConfirmButton = document.getElementById("prepConfirmButton");

const transitionLine1 = document.getElementById("transitionLine1");
const transitionLine2 = document.getElementById("transitionLine2");

const timer = document.getElementById("timer");

const flipMinTens = document.getElementById("flip-min-tens");
const flipMinOnes = document.getElementById("flip-min-ones");
const flipSecTens = document.getElementById("flip-sec-tens");
const flipSecOnes = document.getElementById("flip-sec-ones");

const gongSound = new Audio("gong.mp3");
gongSound.preload = "auto";

let waitingInterval = null;
let breakInterval = null;

let activeStartTime = null;
let activeEndTime = null;

let appState = "idle";
let soundUnlocked = false;
let typingToken = 0;

/* =========================
   HELPERS
========================= */

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function resetTypingToken() {
  typingToken += 1;
}

async function typeText(element, text, speed = 42) {
  if (!element) return;
  typingToken += 1;
  const token = typingToken;

  element.textContent = "";
  element.classList.add("note-writing-caret");

  for (let i = 0; i < text.length; i++) {
    if (token !== typingToken) return;
    element.textContent += text[i];
    await wait(speed);
  }

  await wait(180);

  if (token === typingToken) {
    element.classList.remove("note-writing-caret");
  }
}

function fillTimeOptions() {
  for (let i = 0; i < 24; i++) {
    const hour = String(i).padStart(2, "0");
    startHour.innerHTML += `<option value="${hour}">${hour}</option>`;
    endHour.innerHTML += `<option value="${hour}">${hour}</option>`;
  }

  for (let i = 0; i < 60; i++) {
    const minute = String(i).padStart(2, "0");
    startMinute.innerHTML += `<option value="${minute}">${minute}</option>`;
    endMinute.innerHTML += `<option value="${minute}">${minute}</option>`;
  }
}

function getTodayDateForTime(timeString) {
  const [hours, minutes] = timeString.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function validateTimes(startTime, endTime) {
  return getTodayDateForTime(endTime) > getTodayDateForTime(startTime);
}

function clearIntervals() {
  if (waitingInterval) {
    clearInterval(waitingInterval);
    waitingInterval = null;
  }
  if (breakInterval) {
    clearInterval(breakInterval);
    breakInterval = null;
  }
}

function showOnlyScreen(screen) {
  setupScreen.style.display = "none";
  transitionScreen.style.display = "none";
  breakScreen.style.display = "none";

  if (screen) {
    screen.style.display = "block";
  }
}

function updateFlipClock(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  const minString = String(minutes).padStart(2, "0");
  const secString = String(seconds).padStart(2, "0");

  flipMinTens.textContent = minString[0];
  flipMinOnes.textContent = minString[1];
  flipSecTens.textContent = secString[0];
  flipSecOnes.textContent = secString[1];

  if (timer) {
    timer.textContent = `${minString}:${secString}`;
  }
}

/* =========================
   AUDIO
========================= */

async function unlockSound() {
  if (soundUnlocked) return true;

  try {
    gongSound.muted = true;
    gongSound.currentTime = 0;
    const playPromise = gongSound.play();
    if (playPromise) await playPromise;
    gongSound.pause();
    gongSound.currentTime = 0;
    gongSound.muted = false;
    soundUnlocked = true;
    return true;
  } catch (error) {
    gongSound.muted = false;
    return false;
  }
}

function playGong() {
  try {
    const gong = gongSound.cloneNode();
    gong.volume = 0.75;
    gong.play().catch(() => {});
  } catch (error) {}
}

async function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch (error) {}
  }
}

function showNotification(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body });
    } catch (error) {}
  }
}

/* =========================
   PREP ANIMATION
========================= */

function resetPrepVisuals() {
  prepOverlay.style.display = "none";
  prepOverlay.classList.remove("prep-overlay-persistent");
  prepNoteSheet.classList.remove("is-placing");

  gsap.set(prepNoteContent, { opacity: 0, y: 8 });
  gsap.set(prepConfirmButton, { opacity: 0, y: 8, pointerEvents: "none" });
  gsap.set(prepFlightShadow, { opacity: 0 });
}

function animatePrepStickyIn() {
  appState = "prep";
  prepOverlay.style.display = "flex";

  prepNoteSheet.classList.remove("is-placing");
  void prepNoteSheet.offsetWidth;
  prepNoteSheet.classList.add("is-placing");

  const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

  tl.set(prepFlightShadow, {
    opacity: 0,
    x: 685,
    y: 56,
    skewX: -8,
    scaleX: 1.45,
    scaleY: 0.96,
    filter: "blur(20px)"
  });

  tl.to(prepFlightShadow, {
    duration: 0.18,
    opacity: 0.56
  }, 0);

  tl.to(prepFlightShadow, {
    duration: 1.18,
    x: 0,
    y: 142,
    skewX: -2,
    scaleX: 1,
    scaleY: 0.66,
    opacity: 0,
    filter: "blur(8px)"
  }, 0);

  tl.to(prepNoteContent, {
    duration: 0.3,
    opacity: 1,
    y: 0
  }, 0.95);

  tl.to(prepConfirmButton, {
    duration: 0.3,
    opacity: 1,
    y: 0,
    pointerEvents: "auto"
  }, 1.05);

  tl.call(() => {
    prepOverlay.classList.add("prep-overlay-persistent");
  });
}

/* =========================
   FLOW
========================= */

async function startWaitingPhase() {
  appState = "waiting";
  showOnlyScreen(transitionScreen);

  resetTypingToken();
  transitionLine1.textContent = "";
  transitionLine2.textContent = "";

  await typeText(transitionLine1, "Deine Pause ist um", 46);
  await typeText(transitionLine2, activeStartTime, 62);

  const startDate = getTodayDateForTime(activeStartTime);

  waitingInterval = setInterval(async () => {
    if (appState !== "waiting") return;

    const now = new Date();
    if (now >= startDate) {
      clearIntervals();
      playGong();
      showNotification("Pause 💛", "Zeit für deine Pause 🌿");
      await startBreakPhase();
    }
  }, 500);
}

async function startBreakPhase() {
  appState = "break";
  showOnlyScreen(breakScreen);

  const endDate = getTodayDateForTime(activeEndTime);

  function renderRemainingTime() {
    if (appState !== "break") return;

    const now = new Date();
    const remainingSeconds = Math.max(0, Math.floor((endDate - now) / 1000));

    updateFlipClock(remainingSeconds);

    if (remainingSeconds <= 0) {
      clearIntervals();
      playGong();
      showNotification("Pause vorbei ✨", "Deine Pause ist jetzt vorbei.");
      resetApp();
    }
  }

  renderRemainingTime();
  breakInterval = setInterval(renderRemainingTime, 250);
}

function resetApp() {
  clearIntervals();
  resetTypingToken();

  appState = "idle";
  activeStartTime = null;
  activeEndTime = null;

  startHour.value = "";
  startMinute.value = "";
  endHour.value = "";
  endMinute.value = "";

  updateFlipClock(0);
  transitionLine1.textContent = "";
  transitionLine2.textContent = "";

  showOnlyScreen(setupScreen);
  resetPrepVisuals();
}

/* =========================
   EVENTS
========================= */

startButton.addEventListener("click", async () => {
  await unlockSound();
  await requestNotificationPermission();

  if (!startHour.value || !startMinute.value || !endHour.value || !endMinute.value) {
    alert("Bitte beide Zeiten vollständig eingeben 🥺");
    return;
  }

  const startTime = `${startHour.value}:${startMinute.value}`;
  const endTime = `${endHour.value}:${endMinute.value}`;

  if (!validateTimes(startTime, endTime)) {
    alert("Die Endzeit muss nach der Startzeit liegen 💛");
    return;
  }

  activeStartTime = startTime;
  activeEndTime = endTime;

  resetPrepVisuals();
  animatePrepStickyIn();
});

prepConfirmButton.addEventListener("click", async () => {
  await gsap.to(prepConfirmButton, {
    opacity: 0,
    y: 6,
    duration: 0.22,
    pointerEvents: "none"
  });

  await gsap.to(prepNoteContent, {
    opacity: 0,
    y: -6,
    duration: 0.24
  });

  prepOverlay.style.display = "none";

  const now = new Date();
  const startDate = getTodayDateForTime(activeStartTime);
  const endDate = getTodayDateForTime(activeEndTime);

  if (now >= endDate) {
    alert("Diese Zeitspanne ist heute schon vorbei 💛");
    resetApp();
    return;
  }

  if (now >= startDate && now < endDate) {
    playGong();
    showNotification("Pause 💛", "Zeit für deine Pause 🌿");
    await startBreakPhase();
    return;
  }

  await startWaitingPhase();
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && appState === "waiting") {
    const startDate = getTodayDateForTime(activeStartTime);
    if (new Date() >= startDate) {
      clearIntervals();
      startBreakPhase();
    }
  }
});

window.addEventListener("focus", () => {
  if (appState === "waiting") {
    const startDate = getTodayDateForTime(activeStartTime);
    if (new Date() >= startDate) {
      clearIntervals();
      startBreakPhase();
    }
  }
});

/* =========================
   INIT
========================= */

fillTimeOptions();
updateFlipClock(0);
resetPrepVisuals();
showOnlyScreen(setupScreen);
