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

const stickyNote = document.getElementById("sticky-note");
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

timeForm.addEventListener("submit", handleTimeSubmit);
prepConfirmButton.addEventListener("click", handlePrepConfirm);

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
startHour.innerHTML += `<option value="${hour}">${hour}</option>`;
endHour.innerHTML += `<option value="${hour}">${hour}</option>`;
}

for (let i = 0; i < 60; i++) {
const minute = String(i).padStart(2, "0");
startMinute.innerHTML += `<option value="${minute}">${minute}</option>`;
endMinute.innerHTML += `<option value="${minute}">${minute}</option>`;
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
return {
valid: false,
reason: "Die Endzeit muss nach der Startzeit liegen 💛",
};
}

if (endDate <= now) {
return {
valid: false,
reason: "Diese Pause ist heute leider schon vorbei 💛",
};
}

if (startDate <= now && endDate > now) {
return {
valid: true,
mode: "start-break-now",
};
}

if (startDate > now && endDate > now) {
return {
valid: true,
mode: "wait-for-break",
};
}

return {
valid: false,
reason: "Bitte überprüfe deine Zeiten nochmal 💛",
};
}


/* =========================
SCREEN HELPERS
========================= */

function showScreen(screenName) {
startScreen.classList.remove("is-active");
transitionScreen.classList.remove("is-active");
breakScreen.classList.remove("is-active");

document.body.classList.remove("start-active", "transition-active", "break-active");

if (screenName === "start") {
startScreen.classList.add("is-active");
document.body.classList.add("start-active");
}

if (screenName === "transition") {
transitionScreen.classList.add("is-active");
document.body.classList.add("transition-active");
}

if (screenName === "break") {
breakScreen.classList.add("is-active");
document.body.classList.add("break-active");
}
}

}


/* =========================
STICKY NOTE
========================= */

function showStickyNote() {
stickyNote.classList.remove("is-hidden");

if (window.gsap) {
gsap.fromTo(
stickyNote,
{
x: "90vw",
opacity: 0,
scale: 0.98,
},
{
x: 0,
opacity: 1,
scale: 1,
duration: 0.85,
ease: "power3.out",
}
);
}
}

function hideStickyNote() {
stickyNote.classList.add("is-hidden");
}

function setStickyState(state) {
stickyNote.dataset.state = state;

stickyStates.forEach((stateEl) => {
const isTarget = stateEl.dataset.stickyState === state;
stateEl.classList.toggle("is-active", isTarget);
});
}

function changeStickyStateWithFade(state) {
if (!window.gsap) {
setStickyState(state);
return;
}

const currentState = document.querySelector(".sticky-note__state.is-active");

gsap.to(currentState, {
opacity: 0,
duration: 0.25,
ease: "power1.out",
onComplete: () => {
setStickyState(state);

const newState = document.querySelector(".sticky-note__state.is-active");

gsap.fromTo(
newState,
{ opacity: 0 },
{
opacity: 1,
duration: 0.35,
ease: "power1.out",
}
);
},
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

flipMinTens.textContent = minString[0];
flipMinOnes.textContent = minString[1];
flipSecTens.textContent = secString[0];
flipSecOnes.textContent = secString[1];

if (timer) {
timer.textContent = `${minString}:${secString}`;
}
}


/* =========================
AUDIO / NOTIFICATIONS
========================= */

async function unlockSound() {
if (soundUnlocked || !gongSound) return true;

try {
gongSound.muted = true;
gongSound.currentTime = 0;

await gongSound.play();

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

gong.play()
.then(() => fadeGong(gong))
.catch((error) => console.log("Gong Fehler:", error));
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
INTERVAL HELPERS
========================= */

function clearAllTimers() {
if (waitingInterval) {
clearInterval(waitingInterval);
waitingInterval = null;
}

if (breakInterval) {
clearInterval(breakInterval);
breakInterval = null;
}

if (endingTimeout) {
clearTimeout(endingTimeout);
endingTimeout = null;
}
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
setStickyState("planned");
showStickyNote();

if (nextBreakTime) {
nextBreakTime.textContent = activeStartTime;
}
}

function handlePrepConfirm() {
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
setStickyState("break");
showStickyNote();

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

if (remainingSeconds <= 0) {
triggerBreakEnd();
}
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

endingTimeout = setTimeout(() => {
changeStickyStateWithFade("done");

endingTimeout = setTimeout(() => {
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

startHour.value = "";
startMinute.value = "";
endHour.value = "";
endMinute.value = "";

updateFlipClock(0);
hideStickyNote();
setStickyState("planned");
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
}
