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
const prepNoteContent = document.getElementById("prep-note-content");
const prepFlightShadow = document.querySelector(".prep-flight-shadow");
const prepRestShadow = document.querySelector(".prep-rest-shadow");

const waitingText = document.getElementById("waiting-text");
const timer = document.getElementById("timer");

const flipMinTens = document.getElementById("flip-min-tens");
const flipMinOnes = document.getElementById("flip-min-ones");
const flipSecTens = document.getElementById("flip-sec-tens");
const flipSecOnes = document.getElementById("flip-sec-ones");

const gongSound = new Audio("gong.mp3");
gongSound.preload = "auto";

let waitingInterval = null;
let breakInterval = null;
let reminderTimeout = null;

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

  if (reminderTimeout) {
    clearTimeout(reminderTimeout);
    reminderTimeout = null;
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
   SCREEN HELPERS
========================= */

function showSetupScreen() {
  document.body.classList.remove("waiting-active", "break-active");

  setupScreen.style.display = "block";
  waitingScreen.style.display = "none";
  breakScreen.style.display = "none";
}

function showWaitingScreen() {
  document.body.classList.add("waiting-active");
  document.body.classList.remove("break-active");

  setupScreen.style.display = "none";
  waitingScreen.style.display = "block";
  breakScreen.style.display = "none";
}

function showBreakScreen() {
  document.body.classList.add("break-active");
  document.body.classList.remove("waiting-active");

  setupScreen.style.display = "none";
  waitingScreen.style.display = "none";
  breakScreen.style.display = "block";
}

/* =========================
   NOTE CONTENT HELPERS
========================= */

function resetTypingToken() {
  typingToken += 1;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function blurSetupScreenBeforePrep() {
  if (!setupScreen) return;
  setupScreen.classList.add("is-blurring");
  await wait(420);
}

function showPrepNote() {
  if (!prepOverlay || !prepNote) return;

  appState = "prep";
  prepOverlay.style.display = "flex";
  prepOverlay.classList.remove("prep-overlay-persistent");

  prepNote.classList.remove("is-taking-away");
  prepNote.classList.remove("is-placing");

  const isMobile = window.innerWidth <= 768;

  const noteStart = isMobile
    ? {
        x: 360,
        y: -24,
        rotation: 0.3,
        skewX: -4,
        scaleX: 1.56,
        scaleY: 3.1
      }
    : {
        x: 640,
        y: -34,
        rotation: 2.4,
        skewX: -1,
        scaleX: 1.95,
        scaleY: 4.15
      };

  const noteEnd = isMobile
    ? {
        x: 0,
        y: 54,
        rotation: -3,
        skewX: 0,
        scaleX: 1,
        scaleY: 1
      }
    : {
        x: 0,
        y: 118,
        rotation: -3,
        skewX: 0,
        scaleX: 1,
        scaleY: 1
      };

  const flightShadowStart = isMobile
    ? {
        x: 360,
        y: 10,
        skewX: -16,
        scaleX: 1.6,
        scaleY: 3.05,
        opacity: 0.5,
        filter: "blur(22px)"
      }
    : {
        x: 640,
        y: 8,
        skewX: -16,
        scaleX: 1.9,
        scaleY: 3.9,
        opacity: 0.56,
        filter: "blur(24px)"
      };

  const flightShadowEnd = isMobile
    ? {
        x: 0,
        y: 60,
        skewX: 0,
        scaleX: 1,
        scaleY: 0.72,
        opacity: 0,
        filter: "blur(8px)"
      }
    : {
        x: 0,
        y: 126,
        skewX: 0,
        scaleX: 1,
        scaleY: 0.72,
        opacity: 0,
        filter: "blur(8px)"
      };

  gsap.killTweensOf(prepNote);
  if (prepFlightShadow) gsap.killTweensOf(prepFlightShadow);
  if (prepRestShadow) gsap.killTweensOf(prepRestShadow);

  gsap.set(prepNote, {
    clearProps: "transform",
    transformOrigin: "top right"
  });

  gsap.set(prepNote, {
    ...noteStart
  });

  if (prepFlightShadow) {
    gsap.set(prepFlightShadow, {
      clearProps: "transform,opacity,filter",
      transformOrigin: "top right"
    });

    gsap.set(prepFlightShadow, {
      ...flightShadowStart
    });
  }

  if (prepRestShadow) {
    gsap.set(prepRestShadow, {
      opacity: 0
    });
  }

  const tl = gsap.timeline();

  tl.to(
    prepNote,
    {
      ...noteEnd,
      duration: 1.18,
      ease: "power3.out"
    },
    0
  );

  if (prepFlightShadow) {
    tl.to(
      prepFlightShadow,
      {
        ...flightShadowEnd,
        duration: 1.22,
        ease: "power3.out"
      },
      0
    );
  }

  if (prepRestShadow) {
    tl.to(
      prepRestShadow,
      {
        opacity: 0.55,
        duration: 0.28,
        ease: "power2.out"
      },
      0.88
    );
  }
}
function showConfirmButton() {
  if (!prepConfirmButton) return;
  prepConfirmButton.style.opacity = "1";
  prepConfirmButton.style.pointerEvents = "auto";
  prepConfirmButton.style.display = "inline-flex";
}

function hideConfirmButton() {
  if (!prepConfirmButton) return;
  prepConfirmButton.style.opacity = "0";
  prepConfirmButton.style.pointerEvents = "none";
}

function resetPrepNoteVisualState() {
  if (!prepOverlay || !prepNote) return;

  gsap.killTweensOf(prepNote);
  if (prepFlightShadow) gsap.killTweensOf(prepFlightShadow);
  if (prepRestShadow) gsap.killTweensOf(prepRestShadow);

  prepOverlay.style.display = "none";
  prepOverlay.classList.remove("prep-overlay-persistent");
  prepNote.classList.remove("is-taking-away");
  prepNote.classList.remove("is-placing");

  gsap.set(prepNote, { clearProps: "transform" });

  if (prepFlightShadow) {
    gsap.set(prepFlightShadow, {
      clearProps: "transform,opacity,filter"
    });
  }

  if (prepRestShadow) {
    gsap.set(prepRestShadow, {
      opacity: 0.55
    });
  }
}
function renderPrepIntroNote() {
  if (!prepNoteContent) return;

  prepNoteContent.innerHTML = `
    <div class="note-copy note-copy-intro">
      <div class="note-main-text">
        Deine Pause ist<br>
        eingeplant 🌿🍵
      </div>

      <div class="note-checklist">
        <div class="note-check-item">✓ Erinnerung aktiv</div>
        <div class="note-check-item">✓ Gong ist an</div>
      </div>
    </div>
  `;
}

function renderWaitingNote(startTime) {
  if (!prepNoteContent) return;

  prepNoteContent.innerHTML = `
    <div class="note-copy note-copy-waiting">
      <div id="note-handwriting-line-1" class="note-handwriting-line"></div>
    </div>
  `;

  const line1 = document.getElementById("note-handwriting-line-1");
  return typeText(line1, `Deine nächste Pause ist um ${startTime}.`, 52);
}

function renderBreakNote() {
  if (!prepNoteContent) return;

  prepNoteContent.innerHTML = `
    <div class="note-copy note-copy-break">
      <div id="note-handwriting-line-1" class="note-handwriting-line"></div>
    </div>
  `;

  const line1 = document.getElementById("note-handwriting-line-1");
  return typeText(line1, "Schöne Pause", 48);
}

async function appendBreakClosingNote() {
  if (!prepNoteContent) return;

  let wrap = prepNoteContent.querySelector(".note-copy-break");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "note-copy note-copy-break";
    prepNoteContent.innerHTML = "";
    prepNoteContent.appendChild(wrap);
  }

  let line2 = document.getElementById("note-handwriting-line-2");
  if (!line2) {
    line2 = document.createElement("div");
    line2.id = "note-handwriting-line-2";
    line2.className = "note-handwriting-line note-handwriting-line-secondary";
    wrap.appendChild(line2);
  }

  await typeText(line2, "Danke, dass du dir heute Zeit für dich genommen hast.", 38);
}

async function fadeNoteContentOut(duration = 380) {
  if (!prepNoteContent) return;

  prepNoteContent.style.transition = `opacity ${duration}ms ease`;
  prepNoteContent.style.opacity = "0";
  await wait(duration);
}

async function swapNoteContent(renderFn) {
  if (!prepNoteContent) return;

  await fadeNoteContentOut(320);
  resetTypingToken();
  prepNoteContent.innerHTML = "";
  prepNoteContent.style.transition = "none";
  prepNoteContent.style.opacity = "1";

  const maybePromise = renderFn();
  if (maybePromise instanceof Promise) {
    await maybePromise;
  }
}

/* =========================
   TYPING EFFECT
========================= */

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
  resetTypingToken();

  appState = "idle";
  prepConfirmed = false;
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
  resetPrepNoteVisualState();

  if (prepNoteContent) {
    prepNoteContent.innerHTML = "";
    prepNoteContent.style.opacity = "1";
    prepNoteContent.style.transition = "none";
  }

  showConfirmButton();
}


async function confirmPrepNoteAndContinue() {
  hideConfirmButton();

  gsap.killTweensOf(prepNote);
  if (prepFlightShadow) gsap.killTweensOf(prepFlightShadow);
  if (prepRestShadow) gsap.killTweensOf(prepRestShadow);

  if (prepOverlay) {
    prepOverlay.classList.add("prep-overlay-persistent");
  }

  if (prepNote) {
    gsap.set(prepNote, { clearProps: "transform" });
  }

  if (prepFlightShadow) {
    gsap.set(prepFlightShadow, { clearProps: "transform,opacity,filter" });
  }

  if (prepRestShadow) {
    gsap.set(prepRestShadow, { opacity: 0.55 });
  }

  if (activeStartTime && activeEndTime) {
    const now = new Date();
    const startDate = getTodayDateForTime(activeStartTime);
    const endDate = getTodayDateForTime(activeEndTime);

    if (now >= endDate) {
      alert("Diese Zeitspanne ist heute schon vorbei 💛");
      resetApp();
      return;
    }

    if (now >= startDate && now < endDate) {
      await startBreakPhase(false);
      return;
    }

    await startWaitingPhase(activeStartTime, activeEndTime);
  }
}

async function startWaitingPhase(startTime, endTime) {
  clearIntervals();
  resetTypingToken();

  appState = "waiting";
  activeStartTime = startTime;
  activeEndTime = endTime;

  showWaitingScreen();

  if (waitingText) {
    waitingText.textContent = `Deine nächste Pause ist um ${startTime}`;
  }

  await swapNoteContent(() => renderWaitingNote(startTime));

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
  if (startGongPlayed === false && playCue) {
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

  if (playCue && startGongPlayed === false) {
    playGong();
    showNotification("Pause 💛", "Zeit für deine Pause 🌿");
    startGongPlayed = true;
  }

  await swapNoteContent(() => renderBreakNote());

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
  await appendBreakClosingNote();
  await wait(2200);

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
  resetTypingToken();

  renderPrepIntroNote();
  showConfirmButton();

  await blurSetupScreenBeforePrep();
  showPrepNote();
});

if (prepConfirmButton) {
  prepConfirmButton.addEventListener("click", async () => {
    prepConfirmed = true;
    await confirmPrepNoteAndContinue();
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
