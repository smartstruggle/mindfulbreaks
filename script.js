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

startButton.addEventListener("click", () => {
const startTime = `${startHour.value}:${startMinute.value}`;
const endTime = `${endHour.value}:${endMinute.value}`;



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

  
if (!startHour.value || !startMinute.value || !endHour.value || !endMinute.value) {
alert("Bitte beide Zeiten vollständig eingeben 🥺");
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

startHour.value = "";
startMinute.value = "";
endHour.value = "";
endMinute.value = "";  
}
}, 1000);
}

