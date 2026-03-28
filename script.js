<script>
const startButton = document.getElementById("start-button");
const setupScreen = document.getElementById("setup-screen");
const waitingScreen = document.getElementById("waiting-screen");

startButton.addEventListener("click", () => {
setupScreen.style.display = "none";
waitingScreen.style.display = "block";
});
</script>
