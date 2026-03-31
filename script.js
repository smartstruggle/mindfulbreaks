const startButton = document.getElementById("start-button");

const setupScreen = document.getElementById("setup-screen");
const waitingScreen = document.getElementById("waiting-screen");
const breakScreen = document.getElementById("break-screen");

const startHour = document.getElementById("start-hour");
const startMinute = document.getElementById("start-minute");
const endHour = document.getElementById("end-hour");
const endMinute = document.getElementById("end-minute");

const prepOverlay = document.getElementById("prep-overlay");
const prepNote = document.getElementById("prep-note");
const prepConfirmButton = document.getElementById("prep-confirm-button");

const waitingText = document.getElementById("waiting-text");
const timer = document.getElementById("timer");

const flipMinTens = document.getElementById("flip-min-tens");
const flipMinOnes = document.getElementById("flip-min-ones");
const flipSecTens = document.getElementById("flip-sec-tens");
const flipSecOnes = document.getElementById("flip-sec-ones");

const gongSound = new Audio("gong.mp3");
gongSound.preload = "auto";

const waitingStickyInner = document.querySelector("#waiting-screen .sticky-note-inner");
const breakStickyInner = document.querySelector("#break-screen .sticky-note-inner");
const breakStickyNote = document.querySelector("#break-screen .sticky-note");

let waitingInterval = null;
let breakInterval = null;

let activeStartTime = null;
let activeEndTime = null;

let soundUnlocked = false;
let appState = "idle"; // idle | prep | waiting | break | ending
let prepConfirmed = false;
let startGongPlayed = false;
let endGongPlayed = false;
let endingSequenceRunning = false;
let typingToken = 0;

/* =========================
   BASIC SETUP
========================= */

function fillTimeOptions() {
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, "0");
    startHour.innerHTML += `<option value="${hour}">${hour}</option>`;
    endHour.innerHTML += `<option value="${hour}">${hour}</option>`;
  }

  for (let i = 0; i < 60; i++) {
    const minute = i.toString().padStart(2, "0");
    startMinute.innerHTML += `<option value="${minute}">${minute}</option>`;
    endMinute.innerHTML += `<option value="${minute}">${minute}</option>`;
  }
}

function updateFlipClock(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  const minString = minutes.toString().padStart(2, "0");
  const secString = seconds.toString().padStart(2, "0");

  if (flipMinTens) flipMinTens.textContent = minString[0];
  if (flipMinOnes) flipMinOnes.textContent = minString[1];
  if (flipSecTens) flipSecTens.textContent = secString[0];
  if (flipSecOnes) flipSecOnes.textContent = secString[1];
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

function getTodayDateForTime(timeString) {
  const [hours, minutes] = timeString.split(":").map(Number);
  const date = new Date();

  date.setHours(hours);
  date.setMinutes(minutes);
  date.setSeconds(0);
  date.setMilliseconds(0);

  return date;
}

function validateTimes(startTime, endTime) {
  const startDate = getTodayDateForTime(startTime);
  const endDate = getTodayDateForTime(endTime);
  return endDate > startDate;
}

/* =========================
   AUDIO / NOTIFICATIONS
========================= */

async function unlockSound() {
  if (soundUnlocked) return true;

  try {
    gongSound.muted = true;
    gongSound.currentTime = 0;

    const playPromise = gongSound.play();
    if (playPromise !== undefined) {
      await playPromise;
    }

    gongSound.pause();
    gongSound.currentTime = 0;
    gongSound.muted = false;
    soundUnlocked = true;

    console.log("Sound erfolgreich freigeschaltet.");
    return true;
  } catch (error) {
    gongSound.muted = false;
    console.log("Sound konnte nicht freigeschaltet werden:", error);
    return false;
  }
}

function playGong() {
  try {
    const gong = gongSound.cloneNode();
    gong.volume = 0;
    gong.currentTime = 0;

    const playPromise = gong.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          let vol = 0;

          const fadeIn = setInterval(() => {
            vol += 0.04;
            if (vol >= 0.75) {
              gong.volume = 0.75;
              clearInterval(fadeIn);
            } else {
              gong.volume = vol;
            }
          }, 40);

          setTimeout(() => {
            let fadeVol = gong.volume;

            const fadeOut = setInterval(() => {
              fadeVol -= 0.02;
              if (fadeVol <= 0) {
                gong.volume = 0;
                clearInterval(fadeOut);
              } else {
                gong.volume = fadeVol;
              }
            }, 60);
          }, 3000);
        })
        .catch((error) => {
          console.log("Gong Fehler:", error);
        });
    }
  } catch (error) {
    console.log("Gong konnte nicht abgespielt werden:", error);
  }
}

async function requestNotificationPermission() {
  try {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  } catch (error) {
    console.log("Notification permission fehlgeschlagen:", error);
  }
}

function showNotification(title, body) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch (error) {
    console.log("Notification konnte nicht angezeigt werden:", error);
  }
}

/* =========================
   SCREEN / NOTE HELPERS
========================= */

function showSetupScreen() {
  setupScreen.style.display = "block";
  waitingScreen.style.display = "none";
  breakScreen.style.display = "none";
}

function showWaitingScreen() {
  setupScreen.style.display = "none";
  waitingScreen.style.display = "block";
  breakScreen.style.display = "none";
}

function showBreakScreen() {
  setupScreen.style.display = "none";
  waitingScreen.style.display = "none";
  breakScreen.style.display = "block";
}

function setWaitingStickyMessage(startTime) {
  if (!waitingStickyInner) return;
  waitingStickyInner.innerHTML = `Deine Pause beginnt<br><span id="sticky-waiting-time">${startTime} Uhr</span>`;
}

function setBreakStickyMessage(text) {
  if (!breakStickyInner) return;
  breakStickyInner.textContent = text;
}

function resetBreakStickyAppearance() {
  if (!breakStickyNote) return;
  breakStickyNote.style.transition = "";
  breakStickyNote.style.opacity = "";
  breakStickyNote.style.transform = "";
}

function showPrepNote() {
  if (!prepOverlay || !prepNote) return;

  appState = "prep";
  prepOverlay.style.display = "flex";
  prepNote.classList.remove("is-taking-away");
  prepNote.classList.remove("is-placing");

  void prepNote.offsetWidth;
  prepNote.classList.add("is-placing");
}

function hidePrepNote() {
  if (!prepOverlay || !prepNote) return Promise.resolve();

  prepNote.classList.remove("is-placing");
  prepNote.classList.add("is-taking-away");

  return new Promise((resolve) => {
    setTimeout(() => {
      prepOverlay.style.display = "none";
      prepNote.classList.remove("is-taking-away");
      resolve();
    }, 320);
  });
}

/* =========================
   TYPING EFFECT
========================= */

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function typeText(element, text, speed = 42) {
  if (!element) return;

  typingToken += 1;
  const currentToken = typingToken;

  element.textContent = "";

  for (let i = 0; i < text.length; i++) {
    if (currentToken !== typingToken) return;
    element.textContent += text[i];
    await wait(speed);
  }
}

/* =========================
   APP STATE / FLOW
========================= */

function resetApp() {
  clearIntervals();

  appState = "idle";
  prepConfirmed = false;
  startGongPlayed = false;
  endGongPlayed = false;
  endingSequenceRunning = false;
  typingToken += 1;

  activeStartTime = null;
  activeEndTime = null;

  if (prepOverlay) {
    prepOverlay.style.display = "none";
  }

  showSetupScreen();

  startHour.value = "";
  startMinute.value = "";
  endHour.value = "";
  endMinute.value = "";

  if (timer) {
    timer.textContent = "00:00";
  }

  updateFlipClock(0);

  if (waitingStickyInner) {
    waitingStickyInner.innerHTML = `Nächste Pause<br><span id="sticky-waiting-time">--:-- Uhr</span>`;
  }

  if (breakStickyInner) {
    breakStickyInner.textContent = "Nimm dir Zeit für dich.";
  }

  resetBreakStickyAppearance();
}

async function routeAfterPrepConfirmation() {
  if (!activeStartTime || !activeEndTime) return;

  const now = new Date();
  const startDate = getTodayDateForTime(activeStartTime);
  const endDate = getTodayDateForTime(activeEndTime);

  await hidePrepNote();

  if (now >= endDate) {
    alert("Diese Zeitspanne ist heute schon vorbei 💛");
    resetApp();
    return;
  }

  if (now >= startDate && now < endDate) {
    startBreakPhase(false);
    return;
  }

  startWaitingPhase(activeStartTime, activeEndTime);
}

function startWaitingPhase(startTime, endTime) {
  clearIntervals();

  appState = "waiting";
  activeStartTime = startTime;
  activeEndTime = endTime;

  showWaitingScreen();
  setWaitingStickyMessage(startTime);

  if (waitingText) {
    waitingText.textContent = `Deine nächste Pause ist um ${startTime}`;
  }

  const startDate = getTodayDateForTime(startTime);
  const endDate = getTodayDateForTime(endTime);
  const now = new Date();

  if (endDate <= startDate) {
    alert("Die Endzeit muss nach der Startzeit liegen 💛");
    resetApp();
    return;
  }

  if (now >= endDate) {
    resetApp();
    return;
  }

  if (now >= startDate) {
    triggerBreakStart(true);
    return;
  }

  waitingInterval = setInterval(() => {
    if (appState !== "waiting") return;

    const currentNow = new Date();

    if (currentNow >= startDate) {
      triggerBreakStart(true);
    }
  }, 500);
}

function triggerBreakStart(playCue = true) {
  if (startGongPlayed === false && playCue) {
    playGong();
    showNotification("Pause 💛", "Zeit für deine Pause 🌿");
    startGongPlayed = true;
  }

  startBreakPhase(false);
}

function startBreakPhase(playCue = false) {
  clearIntervals();

  appState = "break";
  showBreakScreen();
  setBreakStickyMessage("Nimm dir Zeit für dich.");

  if (playCue && startGongPlayed === false) {
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

    if (timer) {
      const minutes = Math.floor(remainingSeconds / 60).toString().padStart(2, "0");
      const seconds = (remainingSeconds % 60).toString().padStart(2, "0");
      timer.textContent = `${minutes}:${seconds}`;
    }

    if (remainingSeconds <= 0) {
      triggerBreakEnd();
    }
  }

  renderRemainingTime();
  breakInterval = setInterval(renderRemainingTime, 250);
}

async function triggerBreakEnd() {
  if (endingSequenceRunning) return;
  endingSequenceRunning = true;
  appState = "ending";

  clearIntervals();
  updateFlipClock(0);

  if (timer) {
    timer.textContent = "00:00";
  }

  if (!endGongPlayed) {
    playGong();
    showNotification("Pause vorbei ✨", "Deine Pause ist jetzt vorbei.");
    endGongPlayed = true;
  }

  await wait(3400);

  await typeText(
    breakStickyInner,
    "Schön, dass du dir heute Zeit für dich genommen hast.",
    42
  );

  await wait(1200);

  if (breakStickyNote) {
    breakStickyNote.style.transition = "transform 420ms ease, opacity 420ms ease";
    breakStickyNote.style.opacity = "0";
    breakStickyNote.style.transform = "translateY(-18px) scale(0.97) rotate(-2deg)";
  }

  await wait(440);

  resetApp();
}

function syncAppState() {
  if (!activeStartTime || !activeEndTime) return;
  if (appState === "prep" || appState === "ending") return;

  const now = new Date();
  const startDate = getTodayDateForTime(activeStartTime);
  const endDate = getTodayDateForTime(activeEndTime);

  if (appState === "waiting") {
    if (now >= endDate) {
      resetApp();
      return;
    }

    if (now >= startDate && now < endDate) {
      // kein nachträglicher Gong, wenn der Moment im Hintergrund verpasst wurde
      startGongPlayed = true;
      startBreakPhase(false);
    }
  }

  if (appState === "break") {
    if (now >= endDate) {
      // wenn Ende verpasst wurde, kein nachträglicher Gong
      endGongPlayed = true;
      resetApp();
    }
  }
}

/* =========================
   EVENTS
========================= */

startButton.addEventListener("click", async () => {
  const unlocked = await unlockSound();
  await requestNotificationPermission();

  if (!unlocked) {
    console.log("Hinweis: Sound ist noch nicht freigeschaltet oder Datei fehlt.");
  }

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

  prepConfirmed = false;
  startGongPlayed = false;
  endGongPlayed = false;
  endingSequenceRunning = false;

  showPrepNote();
});

if (prepConfirmButton) {
  prepConfirmButton.addEventListener("click", async () => {
    prepConfirmed = true;
    await routeAfterPrepConfirmation();
  });
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    syncAppState();
  }
});

window.addEventListener("focus", () => {
  syncAppState();
});

gongSound.addEventListener("error", () => {
  console.log("Fehler beim Laden von gong.mp3. Prüfe Dateiname und Speicherort.");
});

/* =========================
   INIT
========================= */

fillTimeOptions();
updateFlipClock(0);
setBreakStickyMessage("Nimm dir Zeit für dich.");
