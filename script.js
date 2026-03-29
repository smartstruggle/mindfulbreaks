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

let appState = {
  mode: "setup", // setup | waiting | break
  startTime: null,
  endTime: null
};

let heartbeatInterval = null;

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
  try {
    await gongSound.play();
    gongSound.pause();
    gongSound.currentTime = 0;
  } catch (error) {
    console.log("Sound konnte nicht freigeschaltet werden:", error);
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
    gongSound.currentTime = 0;
    gongSound.play();
  } catch (error) {
    console.log("Gong konnte nicht abgespielt werden:", error);
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

function resetApp() {
  appState = {
    mode: "setup",
    startTime: null,
    endTime: null
  };

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
  showSetupScreen();
}

function startPlan(startTime, endTime) {
  const startDate = getTodayDateForTime(startTime);
  const endDate = getTodayDateForTime(endTime);

  if (endDate <= startDate) {
    alert("Die Endzeit muss nach der Startzeit liegen 💛");
    resetApp();
    return;
  }

  appState = {
    mode: "waiting",
    startTime,
    endTime
  };

  if (stickyWaitingTime) {
    stickyWaitingTime.textContent = `${startTime} Uhr`;
  }

  if (waitingText) {
    waitingText.textContent = `Deine nächste Pause ist um ${startTime}`;
  }

  syncAppState(true);
}

function syncAppState(playSoundOnTransitions = false) {
  const { mode, startTime, endTime } = appState;

  if (mode === "setup" || !startTime || !endTime) {
    showSetupScreen();
    return;
  }

  const now = new Date();
  const startDate = getTodayDateForTime(startTime);
  const endDate = getTodayDateForTime(endTime);

  if (now < startDate) {
    appState.mode = "waiting";
    showWaitingScreen();

    if (stickyWaitingTime) {
      stickyWaitingTime.textContent = `${startTime} Uhr`;
    }

    return;
  }

  if (now >= startDate && now < endDate) {
    const remainingSeconds = Math.max(0, Math.floor((endDate - now) / 1000));

    if (appState.mode !== "break" && playSoundOnTransitions) {
      playGong();
      showNotification("Pause 💛", "Zeit für deine Pause 🌿");
    }

    appState.mode = "break";
    showBreakScreen();
    updateFlipClock(remainingSeconds);

    if (timer) {
      const minutes = Math.floor(remainingSeconds / 60).toString().padStart(2, "0");
      const seconds = (remainingSeconds % 60).toString().padStart(2, "0");
      timer.textContent = `${minutes}:${seconds}`;
    }

    return;
  }

  if (now >= endDate) {
    if (appState.mode === "break" && playSoundOnTransitions) {
      playGong();
      showNotification("Pause vorbei ✨", "Deine Pause ist jetzt vorbei.");
    }

    resetApp();
  }
}

function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = setInterval(() => {
    syncAppState(false);
  }, 1000);
}

startButton.addEventListener("click", async () => {
  await unlockSound();
  await requestNotificationPermission();

  if (!startHour.value || !startMinute.value || !endHour.value || !endMinute.value) {
    alert("Bitte beide Zeiten vollständig eingeben 🥺");
    return;
  }

  const startTime = `${startHour.value}:${startMinute.value}`;
  const endTime = `${endHour.value}:${endMinute.value}`;

  startPlan(startTime, endTime);
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    syncAppState(false);
  }
});

window.addEventListener("focus", () => {
  syncAppState(false);
});

fillTimeOptions();
updateFlipClock(0);
startHeartbeat();
showSetupScreen();
