<script>
const startButton = document.getElementById("start-button");

const setupScreen = document.getElementById("setup-screen");
const waitingScreen = document.getElementById("waiting-screen");
const breakScreen = document.getElementById("break-screen");

const startTimeInput = document.getElementById("start-time");
const endTimeInput = document.getElementById("end-time");

const waitingText = document.getElementById("waiting-text");
const timer = document.getElementById("timer");

startButton.addEventListener("click", () => {
const startTime = startTimeInput.value;
const endTime = endTimeInput.value;

if (!startTime || !endTime) {
alert("Bitte beide Zeiten eingeben 🥺");
return;
}

// Screens wechseln
setupScreen.style.display = "none";
waitingScreen.style.display = "block";

waitingText.textContent = "Deine nächste Pause ist um " + startTime;

checkTime(startTime, endTime);
});

function checkTime(startTime, endTime) {
const interval = setInterval(() => {
const now = new Date();

const current = now.getHours().toString().padStart(2, "0") + ":" +
now.getMinutes().toString().padStart(2, "0");

if (current === startTime) {
clearInterval(interval);
startBreak(endTime);
}
}, 1000);
}

function startBreak(endTime) {
waitingScreen.style.display = "none";
breakScreen.style.display = "block";

const interval = setInterval(() => {
const now = new Date();

const current = now.getHours().toString().padStart(2, "0") + ":" +
now.getMinutes().toString().padStart(2, "0");

if (current === endTime) {
clearInterval(interval);

breakScreen.style.display = "none";
setupScreen.style.display = "block";
}
}, 1000);
}
<script>
