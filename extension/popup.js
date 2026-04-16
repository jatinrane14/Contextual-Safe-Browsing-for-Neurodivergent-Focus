const mode = document.getElementById("mode");
const timerBox = document.getElementById("timerContainer");

mode.addEventListener("change", () => {
  timerBox.style.display = mode.value === "timer" ? "block" : "none";
});

document.getElementById("start").onclick = () => {
  const config = {
    focusActive: true,
    mode: mode.value,
    level: document.getElementById("level").value,
    intent: document.getElementById("intent").value,
    endTime: null
  };

  if (config.mode === "timer") {
    const time = document.getElementById("time").value;
    config.endTime = Date.now() + time * 60000;
  }

  chrome.storage.sync.set(config, reload);
};

document.getElementById("stop").onclick = () => {
  chrome.storage.sync.set({ focusActive: false }, reload);
};

function reload() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.reload(tabs[0].id);
  });
}