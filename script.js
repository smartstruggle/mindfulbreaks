const startButton = document.getElementById("start-button");

const setupScreen = document.getElementById("setup-screen");
const waitingScreen = document.getElementById("waiting-screen");
const breakScreen = document.getElementById("break-screen");

const startHour = document.getElementById("start-hour");
const startMinute = document.getElementById("start-minute");
const endHour = document.getElementById("end-hour");
const endMinute = document.getElementById("end-minute");

const waitingText = document.getElementById("waiting-text");
const timer = document.getElementById("timer");

const flipMinTens = document.getElementById("flip-min-tens");
const flipMinOnes = document.getElementById("flip-min-ones");
const flipSecTens = document.getElementById("flip-sec-tens");
const flipSecOnes = document.getElementById("flip-sec-ones");

const stickyWaitingTime = document.getElementById("sticky-waiting-time");

const gongSound = new Audio("gong.mp3");
gongSound.preload = "auto";

let waitingInterval = null;
let breakInterval = null;
let activeStartTime = null;
let activeEndTime = null;
let soundUnlocked = false;

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

async function unlockSound() {
  if (soundUnlocked) return true;

 function playGong() {
  try {
    const gongClone = gongSound.cloneNode();

    gongClone.volume = 0; // startet leise
    gongClone.currentTime = 0;

    const playPromise = gongClone.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {
        // sanftes Fade-In
        let vol = 0;
        const fade = setInterval(() => {
          vol += 0.05;
          if (vol >= 0.8) {
            gongClone.volume = 0.8;
            clearInterval(fade);
          } else {
            gongClone.volume = vol;
          }
        }, 40);
      }).catch((error) => {
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

function playGong() {
  try {
    const gongClone = gongSound.cloneNode();
    gongClone.volume = 1;
    gongClone.currentTime = 0;

    const playPromise = gongClone.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.log("Gong konnte nicht abgespielt werden:", error);
      });
    }
  } catch (error) {
    console.log("Gong konnte nicht abgespielt werden:", error);
  }
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

function resetApp() {
  clearIntervals();

  activeStartTime = null;
  activeEndTime = null;

  setupScreen.style.display = "block";
  waitingScreen.style.display = "none";
  breakScreen.style.display = "none";

  startHour.value = "";
  startMinute.value = "";
  endHour.value = "";
  endMinute.value = "";

  if (timer) {
    timer.textContent = "00:00";
  }

  if (stickyWaitingTime) {
    stickyWaitingTime.textContent = "--:-- Uhr";
  }

  updateFlipClock(0);
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

function syncAppState() {
  if (!activeStartTime || !activeEndTime) return;

  const now = new Date();
  const startDate = getTodayDateForTime(activeStartTime);
  const endDate = getTodayDateForTime(activeEndTime);

  if (now < startDate) {
    setupScreen.style.display = "none";
    waitingScreen.style.display = "block";
    breakScreen.style.display = "none";
    return;
  }

  if (now >= startDate && now < endDate) {
    startBreak(activeEndTime, false);
    return;
  }

  if (now >= endDate) {
    resetApp();
  }
}

function startWaitingPhase(startTime, endTime) {
  clearIntervals();

  activeStartTime = startTime;
  activeEndTime = endTime;

  setupScreen.style.display = "none";
  waitingScreen.style.display = "block";
  breakScreen.style.display = "none";

  if (stickyWaitingTime) {
    stickyWaitingTime.textContent = `${startTime} Uhr`;
  }

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
    alert("Diese Zeitspanne ist heute schon vorbei 💛");
    resetApp();
    return;
  }

  if (now >= startDate) {
    playGong();
    showNotification("Pause 💛", "Zeit für deine Pause 🌿");
    startBreak(endTime, false);
    return;
  }

  waitingInterval = setInterval(() => {
    const currentNow = new Date();

    if (currentNow >= startDate) {
      clearInterval(waitingInterval);
      waitingInterval = null;

      playGong();
      showNotification("Pause 💛", "Zeit für deine Pause 🌿");

      startBreak(endTime, false);
    }
  }, 1000);
}

function startBreak(endTime, playStartSignal = false) {
  clearIntervals();

  waitingScreen.style.display = "none";
  breakScreen.style.display = "block";
  setupScreen.style.display = "none";

  if (playStartSignal) {
    playGong();
    showNotification("Pause 💛", "Zeit für deine Pause 🌿");
  }

  const endDate = getTodayDateForTime(endTime);

  function renderRemainingTime() {
    const now = new Date();
    let remainingSeconds = Math.floor((endDate - now) / 1000);

    if (remainingSeconds <= 0) {
      updateFlipClock(0);

      if (timer) {
        timer.textContent = "00:00";
      }

      clearIntervals();
      playGong();
      showNotification("Pause vorbei ✨", "Deine Pause ist jetzt vorbei.");
      resetApp();
      return;
    }

    updateFlipClock(remainingSeconds);

    if (timer) {
      const minutes = Math.floor(remainingSeconds / 60).toString().padStart(2, "0");
      const seconds = (remainingSeconds % 60).toString().padStart(2, "0");
      timer.textContent = `${minutes}:${seconds}`;
    }
  }

  renderRemainingTime();
  breakInterval = setInterval(renderRemainingTime, 1000);
}

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

  startWaitingPhase(startTime, endTime);
});

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

fillTimeOptions();
updateFlipClock(0);
