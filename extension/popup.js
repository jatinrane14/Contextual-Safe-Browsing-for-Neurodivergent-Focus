document.getElementById("start").onclick = () => {
  const mode = document.getElementById("mode").value;
  const level = document.getElementById("level").value;
  const intent = document.getElementById("intent").value;
  const time = document.getElementById("time").value;

  let endTime = null;

  if (mode === "timer" && time) {
    endTime = Date.now() + time * 60 * 1000;
  }

  chrome.storage.sync.set({
    focusActive: true,
    mode,
    level,
    intent,
    endTime
  }, () => {
    document.getElementById("status").innerText = "✅ Focus Started";
    reloadTab();
  });
};

document.getElementById("stop").onclick = () => {
  chrome.storage.sync.set({ focusActive: false }, () => {
    document.getElementById("status").innerText = "❌ Stopped";
    reloadTab();
  });
};

function reloadTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.reload(tabs[0].id);
  });
}