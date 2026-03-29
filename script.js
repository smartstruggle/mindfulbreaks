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

function updateFlipClock(totalSeconds) {
const minutes = Math.floor(totalSeconds / 60);
const seconds = totalSeconds % 60;

const minString = minutes.toString().padStart(2, "0");
const secString = seconds.toString().padStart(2, "0");

flipMinTens.textContent = minString[0];
flipMinOnes.textContent = minString[1];
flipSecTens.textContent = secString[0];
flipSecOnes.textContent = secString[1];
}

function startBreak(endTime) {
waitingScreen.style.display = "none";
breakScreen.style.display = "block";

const now = new Date();

const [endHourValue, endMinuteValue] = endTime.split(":");
const endDate = new Date();

endDate.setHours(parseInt(endHourValue, 10));
endDate.setMinutes(parseInt(endMinuteValue, 10));
endDate.setSeconds(0);
endDate.setMilliseconds(0);

let remainingSeconds = Math.floor((endDate - now) / 1000);

if (remainingSeconds < 0) {
remainingSeconds = 0;
}

updateFlipClock(remainingSeconds);
timer.textContent = `${Math.floor(remainingSeconds / 60)
.toString()
.padStart(2, "0")}:${(remainingSeconds % 60)
.toString()
.padStart(2, "0")}`;

const interval = setInterval(() => {
remainingSeconds--;

if (remainingSeconds < 0) {
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
updateFlipClock(0);
return;
}

updateFlipClock(remainingSeconds);

const minutes = Math.floor(remainingSeconds / 60)
.toString()
.padStart(2, "0");
const seconds = (remainingSeconds % 60)
.toString()
.padStart(2, "0");

timer.textContent = `${minutes}:${seconds}`;
}, 1000);
}



const flipMinTens = document.getElementById("flip-min-tens");
const flipMinOnes = document.getElementById("flip-min-ones");
const flipSecTens = document.getElementById("flip-sec-tens");
const flipSecOnes = document.getElementById("flip-sec-ones");

timer.textContent = `${minutes}:${seconds}`;
}, 1000);
}
