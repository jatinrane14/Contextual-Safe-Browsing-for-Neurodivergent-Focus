let processed = new WeakSet();

chrome.storage.sync.get(null, (config) => {
  if (!config.focusActive) return;

  const intentWords = (config.intent || "").toLowerCase().split(" ");

  startFiltering(config, intentWords);
});

function startFiltering(config, intentWords) {
  runFilter(config, intentWords);

  const observer = new MutationObserver(() => {
    runFilter(config, intentWords);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  if (config.mode === "timer" && config.endTime) {
    showTimer(config.endTime);
  }
}

// BASIC FILTER
function basicFilter(el, intentWords) {
  const text = el.innerText?.toLowerCase() || "";

  const bad = ["ad", "sponsored", "promo", "recommended"];

  let score = 0;

  intentWords.forEach(w => {
    if (text.includes(w)) score++;
  });

  bad.forEach(w => {
    if (text.includes(w)) score--;
  });

  if (score < 0) applyBlur(el);
}

// ADVANCED FILTER (API)
async function advancedFilter(elements) {
  const data = elements.map(el => ({
    text: el.innerText
  }));

  const res = await fetch("http://localhost:5000/analyze-dom", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data })
  });

  const result = await res.json();

  result.blockIndexes.forEach(i => {
    applyBlur(elements[i]);
  });
}

// MAIN RUN
function runFilter(config, intentWords) {
  const elements = Array.from(document.querySelectorAll("div, article"));

  if (config.level === "basic") {
    elements.forEach(el => {
      if (!processed.has(el)) {
        processed.add(el);
        basicFilter(el, intentWords);
      }
    });
  } else {
    advancedFilter(elements);
  }
}

// BLUR
function applyBlur(el) {
  el.classList.add("blur");
}

// TIMER
function showTimer(endTime) {
  const box = document.createElement("div");

  Object.assign(box.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    background: "#1565C0",
    color: "white",
    padding: "10px",
    zIndex: "9999"
  });

  document.body.appendChild(box);

  setInterval(() => {
    const rem = endTime - Date.now();

    if (rem <= 0) {
      box.innerText = "⏰ Done!";
      return;
    }

    const m = Math.floor(rem / 60000);
    const s = Math.floor((rem % 60000) / 1000);

    box.innerText = `⏱ ${m}:${s}`;
  }, 1000);
}