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

const gongSound = new Audio("gong.mp3");
const stickyWaitingTime = document.getElementById("sticky-waiting-time");

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

fillTimeOptions();

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

startButton.addEventListener("click", async () => {
await unlockSound();
await requestNotificationPermission();

if (!startHour.value || !startMinute.value || !endHour.value || !endMinute.value) {
alert("Bitte beide Zeiten vollständig eingeben 🥺");
return;
}

const startTime = `${startHour.value}:${startMinute.value}`;
const endTime = `${endHour.value}:${endMinute.value}`;
stickyWaitingTime.textContent = startTime + " Uhr";
setupScreen.style.display = "none";
waitingScreen.style.display = "block";
breakScreen.style.display = "none";


checkTime(startTime, endTime);
});

function checkTime(startTime, endTime) {
const interval = setInterval(() => {
const now = new Date();

const current =
now.getHours().toString().padStart(2, "0") +
":" +
now.getMinutes().toString().padStart(2, "0");

if (current === startTime) {
clearInterval(interval);

playGong();
showNotification("Pause 💛", "Zeit für deine Pause 🌿");

startBreak(endTime);
}
}, 1000);
}

function startBreak(endTime) {
waitingScreen.style.display = "none";
breakScreen.style.display = "block";

const interval = setInterval(() => {
const now = new Date();

const current =
now.getHours().toString().padStart(2, "0") +
":" +
now.getMinutes().toString().padStart(2, "0");

if (current === endTime) {
clearInterval(interval);

playGong();
showNotification("Pause vorbei ✨", "Deine Pause ist jetzt vorbei.");

breakScreen.style.display = "none";
setupScreen.style.display = "block";

startHour.value = "";
startMinute.value = "";
endHour.value = "";
endMinute.value = "";

timer.textContent = "00:00";
}
}, 1000);
}
