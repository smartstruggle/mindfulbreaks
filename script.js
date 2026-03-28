<script>
const startButton = document.getElementById("start-button");
const setupScreen = document.getElementById("setup-screen");
const waitingScreen = document.getElementById("waiting-screen");
const breakScreen = document.getElementById("break-screen");

const startTimeInput = document.getElementById("start-time");
const endTimeInput = document.getElementById("end-time");
const waitingText = document.getElementById("waiting-text");
const timer = document.getElementById("timer");

let pauseStart = null;
let pauseEnd = null;

startButton.addEventListener("click", () => {
const startTime = startTimeInput.value;
const endTime = endTimeInput.value;

if (!startTime || !endTime) {
alert("Bitte gib Start- und Endzeit ein.");
return;
}

pauseStart = startTime;
pauseEnd = endTime;

waitingText.textContent = `Deine nächste Pause ist um ${pauseStart}`;

setupScreen.style.display = "none";
waitingScreen.style.display = "block";
breakScreen.style.display = "none";
});

function checkPauseTime() {
if (!pauseStart || !pauseEnd) return;

const now = new Date();
const currentHours = now.getHours();
const currentMinutes = now.getMinutes();

const [startHours, startMinutes] = pauseStart.split(":").map(Number);
const [endHours, endMinutes] = pauseEnd.split(":").map(Number);

const currentTotalMinutes = currentHours * 60 + currentMinutes;
const startTotalMinutes = startHours * 60 + startMinutes;
const endTotalMinutes = endHours * 60 + endMinutes;

if (currentTotalMinutes < startTotalMinutes) {
setupScreen.style.display = "none";
waitingScreen.style.display = "block";
breakScreen.style.display = "none";
} else if (
currentTotalMinutes >= startTotalMinutes &&
currentTotalMinutes < endTotalMinutes
) {
setupScreen.style.display = "none";
waitingScreen.style.display = "none";
breakScreen.style.display = "block";

const remainingMinutes = endTotalMinutes - currentTotalMinutes;
timer.textContent = `${remainingMinutes}:00`;
} else if (currentTotalMinutes >= endTotalMinutes) {
setupScreen.style.display = "block";
waitingScreen.style.display = "none";
breakScreen.style.display = "none";

startTimeInput.value = "";
endTimeInput.value = "";
pauseStart = null;
pauseEnd = null;
timer.textContent = "00:00";
}
}

setInterval(checkPauseTime, 1000);

</script>
