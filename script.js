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

if (startHour) {
startHour.innerHTML += `<option value="${hour}">${hour}</option>`;
}

if (endHour) {
endHour.innerHTML += `<option value="${hour}">${hour}</option>`;
}
}

for (let i = 0; i < 60; i++) {
const minute = String(i).padStart(2, "0");

if (startMinute) {
startMinute.innerHTML += `<option value="${minute}">${minute}</option>`;
}

if (endMinute) {
endMinute.innerHTML += `<option value="${minute}">${minute}</option>`;
}
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
if (!startScreen || !transitionScreen || !breakScreen) return;

startScreen.classList.remove("is-active");
transitionScreen.classList.remove("is-active");
breakScreen.classList.remove("is-active");

if (screenName === "start") {
startScreen.classList.add("is-active");
}

if (screenName === "transition") {
transitionScreen.classList.add("is-active");
}

if (screenName === "break") {
breakScreen.classList.add("is-active");
}
}


/* =========================
STICKY PLACEMENT
========================= */

function placeStickyNote(target) {
if (!stickyNote) return;

if (target === "transition") {
const transitionInner = transitionScreen.querySelector(".screen__inner");

if (transitionInner && stickyNote.parentElement !== transitionInner) {
transitionInner.appendChild(stickyNote);
}
}

if (target === "break") {
const breakLayout = breakScreen.querySelector(".break-layout");

if (breakLayout && stickyNote.parentElement !== breakLayout) {
breakLayout.appendChild(stickyNote);
}
}
}


/* =========================
STICKY NOTE MOTION
========================= */

function getStickyBaseRotation() {
if (!stickyNote) return -7;

if (stickyNote.closest(".screen--break")) {
return -5;
}

return -7;
}

function getStickyTape() {
if (!stickyNote) return null;

return stickyNote.querySelector(
"#kelbestreifen, #klebestreifen, #Klebestreifen"
);
}

function stopStickyIdleMotion() {
if (!stickyNote || !window.gsap) return;
gsap.killTweensOf(stickyNote);
}

function startStickyIdleMotion() {
if (!stickyNote || !window.gsap) return;

const baseRotation = getStickyBaseRotation();

gsap.killTweensOf(stickyNote);

gsap.to(stickyNote, {
y: -3,
rotation: baseRotation + 0.45,
duration: 4.8,
ease: "sine.inOut",
repeat: -1,
yoyo: true,
});
}

function playStickyPlaceAnimation() {
if (!stickyNote || !window.gsap) return;

const baseRotation = getStickyBaseRotation();
const tape = getStickyTape();

gsap.killTweensOf(stickyNote);
if (tape) gsap.killTweensOf(tape);

const tl = gsap.timeline({
onComplete: () => {
startStickyIdleMotion();
},
});

gsap.set(stickyNote, {
x: "88vw",
y: -12,
opacity: 0,
scale: 0.98,
rotation: baseRotation + 2.5,
transformOrigin: "50% 38%",
});

if (tape) {
gsap.set(tape, {
transformOrigin: "50% 20%",
scaleY: 1,
});
}

tl.to(stickyNote, {
x: 0,
y: 0,
opacity: 1,
scale: 1,
rotation: baseRotation,
duration: 0.9,
ease: "power3.out",
});

/* kleiner Andock-/Papp-Moment */
tl.to(stickyNote, {
y: 4,
scale: 0.992,
rotation: baseRotation - 0.35,
duration: 0.12,
ease: "power1.out",
});

if (tape) {
tl.to(
tape,
{
scaleY: 0.985,
duration: 0.12,
ease: "power1.out",
},
"<"
);
}

tl.to(stickyNote, {
y: 0,
scale: 1,
rotation: baseRotation,
duration: 0.28,
ease: "back.out(1.5)",
});

if (tape) {
tl.to(
tape,
{
scaleY: 1,
duration: 0.28,
ease: "back.out(1.4)",
},
"<"
);
}
}

function playStickyPeelOutAnimation() {
if (!stickyNote || !window.gsap) {
hideStickyNote();
return Promise.resolve();
}

const baseRotation = getStickyBaseRotation();
const tape = getStickyTape();

gsap.killTweensOf(stickyNote);
if (tape) gsap.killTweensOf(tape);

return new Promise((resolve) => {
const tl = gsap.timeline({
onComplete: () => {
hideStickyNote();
resolve();
},
});

if (tape) {
tl.to(tape, {
scaleY: 0.96,
duration: 0.16,
ease: "power1.out",
transformOrigin: "50% 20%",
});
}

tl.to(stickyNote, {
y: -10,
rotation: baseRotation + 3,
scale: 1.01,
duration: 0.18,
ease: "power2.out",
});

tl.to(stickyNote, {
x: "90vw",
y: -42,
rotation: baseRotation + 9,
opacity: 0,
scale: 0.98,
duration: 0.72,
ease: "power3.in",
});
});
}


/* =========================
STICKY NOTE STATES
========================= */

function showStickyNote(options = {}) {
if (!stickyNote) return;

const { animate = true } = options;

stickyNote.classList.remove("is-hidden");

if (!window.gsap) return;

if (animate) {
playStickyPlaceAnimation();
return;
}

const baseRotation = getStickyBaseRotation();

gsap.killTweensOf(stickyNote);
gsap.set(stickyNote, {
x: 0,
y: 0,
opacity: 1,
scale: 1,
rotation: baseRotation,
transformOrigin: "50% 38%",
});

startStickyIdleMotion();
}

function hideStickyNote() {
if (!stickyNote) return;
stickyNote.classList.add("is-hidden");
}

function setStickyState(state) {
if (!stickyNote) return;

stickyNote.dataset.state = state;

stickyStates.forEach((stateEl) => {
const isTarget = stateEl.dataset.stickyState === state;
stateEl.classList.toggle("is-active", isTarget);
stateEl.style.opacity = isTarget ? "1" : "";
});
}

function changeStickyStateWithFade(state) {
if (!stickyNote) return;

if (!window.gsap) {
setStickyState(state);
return;
}

const currentState = stickyNote.querySelector(".sticky-note__state.is-active");

if (!currentState) {
setStickyState(state);
return;
}

gsap.to(currentState, {
opacity: 0,
y: -3,
duration: 0.16,
ease: "power1.out",
onComplete: () => {
setStickyState(state);

const newState = stickyNote.querySelector(".sticky-note__state.is-active");
if (!newState) return;

gsap.fromTo(
newState,
{ opacity: 0, y: 4 },
{
opacity: 1,
y: 0,
duration: 0.22,
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

if (flipMinTens) flipMinTens.textContent = minString[0];
if (flipMinOnes) flipMinOnes.textContent = minString[1];
if (flipSecTens) flipSecTens.textContent = secString[0];
if (flipSecOnes) flipSecOnes.textContent = secString[1];

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

const playPromise = gongSound.play();

if (playPromise !== undefined) {
await playPromise;
}

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
placeStickyNote("transition");

setStickyState("planned");

if (nextBreakTime) {
nextBreakTime.textContent = activeStartTime;
}

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

endingTimeout = setTimeout(async () => {
await playStickyPeelOutAnimation();
resetApp();
}, 4500);
}, 5000);


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
