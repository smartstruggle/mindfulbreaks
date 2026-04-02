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

let soundUnlocked = false;
let appState = "idle"; // idle | prep | waiting | break | ending
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

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resetTypingToken() {
  typingToken += 1;
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

function formatSelectedStartTime() {
  return `${startHour.value}:${startMinute.value}`;
}

function formatSelectedEndTime() {
  return `${endHour.value}:${endMinute.value}`;
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
   SCREEN HELPERS
========================= */

function showOnlyScreen(screenToShow) {
  setupScreen.style.display = "none";
  transitionScreen.style.display = "none";
  breakScreen.style.display = "none";

  document.body.classList.remove("waiting-active", "break-active");

  if (screenToShow === setupScreen) {
    setupScreen.style.display = "block";
  }

  if (screenToShow === transitionScreen) {
    transitionScreen.style.display = "block";
    document.body.classList.add("waiting-active");
  }

  if (screenToShow === breakScreen) {
    breakScreen.style.display = "block";
    document.body.classList.add("break-active");
  }
}

function showSetupScreen() {
  showOnlyScreen(setupScreen);
}

function showTransitionScreen() {
  showOnlyScreen(transitionScreen);
}

function showBreakScreen() {
  showOnlyScreen(breakScreen);
}

/* =========================
   PREP OVERLAY HELPERS
========================= */

function setPrepIntroContent() {
  if (!prepNoteContent) return;

  prepNoteContent.innerHTML = `
    <div class="note-copy note-copy-intro" id="noteCopyIntro">
      <div class="note-main-text">
        Bevor’s losgeht,<br>
        einmal kurz prüfen:
      </div>

      <div class="note-checklist">
        <div class="note-check-item">✓ Sound ist an</div>
        <div class="note-check-item">✓ Benachrichtigungen sind erlaubt</div>
        <div class="note-check-item">✓ Dein Pausentab ist bereit</div>
      </div>
    </div>
  `;
}

function resetPrepOverlayVisuals() {
  if (!prepOverlay || !prepNoteSheet || !prepFlightShadow || !prepNoteContent || !prepConfirmButton) {
    return;
  }

  prepOverlay.style.display = "none";
  prepOverlay.classList.remove("prep-overlay-persistent");
  prepNoteSheet.classList.remove("is-placing");

  gsap.set(prepFlightShadow, {
    clearProps: "all"
  });

  gsap.set(prepNoteContent, {
    opacity: 0,
    y: 8
  });

  gsap.set(prepConfirmButton, {
    opacity: 0,
    y: 8,
    pointerEvents: "none"
  });
}

async function blurSetupScreenBeforePrep() {
  if (!setupScreen) return;
  setupScreen.classList.add("is-blurring");
  await wait(420);
}

function animatePrepStickyIn() {
  if (!prepOverlay || !prepNoteSheet || !prepFlightShadow || !prepNoteContent || !prepConfirmButton) {
    return;
  }

  appState = "prep";
  prepOverlay.style.display = "flex";
  prepOverlay.classList.remove("prep-overlay-persistent");

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

  tl.to(
    prepFlightShadow,
    {
      duration: 0.16,
      opacity: 0.58
    },
    0
  );

  tl.to(
    prepFlightShadow,
    {
      duration: 1.18,
      x: 0,
      y: 140,
      skewX: -2,
      scaleX: 0.98,
      scaleY: 0.66,
      opacity: 0,
      filter: "blur(8px)",
      ease: "power2.out"
    },
    0
  );

  tl.to(
    prepNoteContent,
    {
      duration: 0.34,
      opacity: 1,
      y: 0
    },
    1.00
  );

  tl.to(
    prepConfirmButton,
    {
      duration: 0.34,
      opacity: 1,
      y: 0,
      pointerEvents: "auto"
    },
    1.08
  );

  tl.call(() => {
    prepOverlay.classList.add("prep-overlay-persistent");
  });
}

async function fadeOutPrepContentAndButton() {
  const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

  tl.to(prepConfirmButton, {
    duration: 0.22,
    opacity: 0,
    y: 6,
    pointerEvents: "none"
  });

  tl.to(
    prepNoteContent,
    {
      duration: 0.24,
      opacity: 0,
      y: -6
    },
    0.02
  );

  return tl;
}

/* =========================
   TYPING EFFECT
========================= */

async function typeText(element, text, speed = 42) {
  if (!element) return;

  typingToken += 1;
  const currentToken = typingToken;

  element.textContent = "";
  element.classList.add("note-writing-caret");

  for (let i = 0; i < text.length; i++) {
    if (currentToken !== typingToken) return;
    element.textContent += text[i];
    await wait(speed);
  }

  await wait(180);

  if (currentToken === typingToken) {
    element.classList.remove("note-writing-caret");
  }
}

/* =========================
   TRANSITION CONTENT
========================= */

async function renderTransitionText(startTime) {
  resetTypingToken();

  if (transitionLine1) transitionLine1.textContent = "";
  if (transitionLine2) transitionLine2.textContent = "";

  await typeText(transitionLine1, "Deine Pause ist um", 48);
  await typeText(transitionLine2, startTime, 62);
}

/* =========================
   APP FLOW
========================= */

function resetApp() {
  clearIntervals();
  resetTypingToken();

  appState = "idle";
  startGongPlayed = false;
  endGongPlayed = false;
  endingSequenceRunning = false;

  activeStartTime = null;
  activeEndTime = null;

  showSetupScreen();

  if (setupScreen) {
    setupScreen.classList.remove("is-blurring");
  }

  startHour.value = "";
  startMinute.value = "";
  endHour.value = "";
  endMinute.value = "";

  if (timer) {
    timer.textContent = "00:00";
  }

  updateFlipClock(0);

  if (transitionLine1) transitionLine1.textContent = "";
  if (transitionLine2) transitionLine2.textContent = "";

  setPrepIntroContent();
  resetPrepOverlayVisuals();
}

async function confirmPrepAndContinue() {
  await fadeOutPrepContentAndButton();

  const now = new Date();
  const startDate = getTodayDateForTime(activeStartTime);
  const endDate = getTodayDateForTime(activeEndTime);

  if (now >= endDate) {
    alert("Diese Zeitspanne ist heute schon vorbei 💛");
    resetApp();
    return;
  }

  if (now >= startDate && now < endDate) {
    prepOverlay.style.display = "none";
    await startBreakPhase(false);
    return;
  }

  prepOverlay.style.display = "none";
  await startWaitingPhase(activeStartTime, activeEndTime);
}

async function startWaitingPhase(startTime, endTime) {
  clearIntervals();
  resetTypingToken();

  appState = "waiting";
  activeStartTime = startTime;
  activeEndTime = endTime;

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

  showTransitionScreen();
  await renderTransitionText(startTime);

  if (now >= startDate) {
    await triggerBreakStart(true);
    return;
  }

  waitingInterval = setInterval(async () => {
    if (appState !== "waiting") return;

    const currentNow = new Date();

    if (currentNow >= startDate) {
      clearIntervals();
      await triggerBreakStart(true);
    }
  }, 500);
}

async function triggerBreakStart(playCue = true) {
  if (!startGongPlayed && playCue) {
    playGong();
    showNotification("Pause 💛", "Zeit für deine Pause 🌿");
    startGongPlayed = true;
  }

  await startBreakPhase(false);
}

async function startBreakPhase(playCue = false) {
  clearIntervals();
  resetTypingToken();

  appState = "break";
  showBreakScreen();

  if (playCue && !startGongPlayed) {
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

  await wait(2200);
  resetApp();
}

function syncAppState() {
  if (!activeStartTime || !activeEndTime) return;
  if (appState === "prep" || appState === "ending" || appState === "idle") return;

  const now = new Date();
  const startDate = getTodayDateForTime(activeStartTime);
  const endDate = getTodayDateForTime(activeEndTime);

  if (appState === "waiting") {
    if (now >= endDate) {
      resetApp();
      return;
    }

    if (now >= startDate && now < endDate) {
      startGongPlayed = true;
      startBreakPhase(false);
    }
  }

  if (appState === "break") {
    if (now >= endDate) {
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

  const startTime = formatSelectedStartTime();
  const endTime = formatSelectedEndTime();

  if (!validateTimes(startTime, endTime)) {
    alert("Die Endzeit muss nach der Startzeit liegen 💛");
    return;
  }

  activeStartTime = startTime;
  activeEndTime = endTime;

  startGongPlayed = false;
  endGongPlayed = false;
  endingSequenceRunning = false;
  resetTypingToken();

  setPrepIntroContent();
  resetPrepOverlayVisuals();

  await blurSetupScreenBeforePrep();
  animatePrepStickyIn();
});

if (prepConfirmButton) {
  prepConfirmButton.addEventListener("click", async () => {
    await confirmPrepAndContinue();
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
   DAYTIME THEME
========================= */

const hour = new Date().getHours();
const body = document.body;

if (hour >= 6 && hour < 11) {
  body.classList.add("morning");
} else if (hour >= 11 && hour < 18) {
  body.classList.add("day");
} else {
  body.classList.add("night");
}

/* =========================
   INIT
========================= */

fillTimeOptions();
updateFlipClock(0);
setPrepIntroContent();
resetPrepOverlayVisuals();
showSetupScreen();
