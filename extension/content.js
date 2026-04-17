let processed = new WeakSet();
let paused = false;
let timerInterval;

// INIT
chrome.storage.sync.get(null, (config) => {
  if (!config.focusActive) return;

  const intentWords = (config.intent || "").toLowerCase().split(" ");

  startFiltering(config, intentWords);
});

// START
function startFiltering(config, intentWords) {
  runFilter(config, intentWords);
  detectAndRemoveNavbar();
  let debounce;
  const observer = new MutationObserver(() => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      detectAndRemoveNavbar();
      runFilter(config, intentWords);
    }, 30);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  createControlPanel(config);

  if (config.mode === "timer" && config.endTime) {
    startTimer(config.endTime);
  }
}

// GET ONLY TEXT CONTENT NODES (NOT WHOLE DOM)
function getCandidateElements() {
  return Array.from(document.querySelectorAll("*")).filter(el => {
    return (
      el.innerText &&
      el.innerText.length > 30 &&
      el.childElementCount === 0 && // leaf nodes only
      el.offsetParent !== null && // visible
      !el.closest("nav, header") // avoid navbar
    );
  });
}

// 🧠 RELEVANCE CHECK
function isRelevant(text, intentWords) {
  let score = 0;

  intentWords.forEach(w => {
    if (text.includes(w)) score += 2;
  });

  const distractors = ["meme", "funny", "viral", "shorts", "prank"];

  distractors.forEach(w => {
    if (text.includes(w)) score -= 2;
  });

  return score > 0;
}

// 🧠 BASIC FILTER
function basicFilter(el, intentWords) {
  const text = el.innerText.toLowerCase();

  if (!isRelevant(text, intentWords)) {
    // 🔥 blur only parent content block
    const container =
      el.closest("ytd-rich-item-renderer") || // YouTube
      el.closest("article") ||
      el.closest("div");

    if (container && !processed.has(container)) {
      processed.add(container);
      applyBlur(container);
    }
  }
}

// 🤖 ADVANCED FILTER (AI)
async function advancedFilter(elements, intent) {
  try {
    const limited = elements.slice(0, 20);

    const data = limited.map(el => ({
      text: el.innerText.slice(0, 200)
    }));

    const res = await fetch("http://127.0.0.1:3000/analyze-dom", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ data, intent })
    });

    const result = await res.json();
    const blockIndexes = result.blockIndexes || [];

    limited.forEach((el, i) => {
      const container =
        el.closest("ytd-rich-item-renderer") ||
        el.closest("article") ||
        el.closest("div");

      if (!container) return;

      if (blockIndexes.includes(i)) applyBlur(container);
      else removeBlur(container);
    });

  } catch (err) {
    console.error("AI Error:", err);
    fallbackBasicFilter(elements);
  }
}

// 🔁 FALLBACK
function fallbackBasicFilter(elements) {
  elements.forEach(el => {
    const text = el.innerText.toLowerCase();

    if (text.includes("ad") || text.includes("promo")) {
      const container = el.closest("div");
      if (container) applyBlur(container);
    }
  });
}

// 🚀 MAIN
function runFilter(config, intentWords) {
  if (paused) return;

  const elements = getCandidateElements();

  if (config.level === "basic") {
    elements.forEach(el => {
      if (!processed.has(el)) {
        processed.add(el);
        basicFilter(el, intentWords);
      }
    });
  } else {
    advancedFilter(elements, config.intent);
  }
}

// 🌫️ BLUR
function applyBlur(el) {
  // Blur container
  el.classList.add("fg-blur");

  // 🔥 Blur all images inside
  const images = el.parentElement.parentElement.parentElement.querySelectorAll("img");

  images.forEach(img => {
    img.style.filter = "blur(8px)";
  });

  // 🔥 Blur video thumbnails (extra safety)
  const media = el.querySelectorAll("video, picture");

  media.forEach(m => {
    m.style.filter = "blur(8px)";
  });
}
// 🔓 REMOVE BLUR
function removeBlur(el) {
  el.classList.remove("fg-blur");

  const images = el.querySelectorAll("img, video, picture");

  images.forEach(media => {
    media.style.filter = "none";
  });
}

// 🎮 CONTROL PANEL (TOP RIGHT)
function createControlPanel(config) {
  const panel = document.createElement("div");
  panel.className = "fg-control-panel";

  const conText = document.createElement("p");
  conText.innerText = "FocusForge";

  const timerText = document.createElement("span");
  timerText.innerText = "⏱ --:--";

  const pauseBtn = document.createElement("button");
  pauseBtn.className = "fg-btn";
  pauseBtn.innerText = "⏸";

  pauseBtn.onclick = () => {
    paused = !paused;
    pauseBtn.innerText = paused ? "▶" : "⏸";
  };

  const stopBtn = document.createElement("button");
  stopBtn.className = "fg-btn";
  stopBtn.innerText = "X";

  stopBtn.onclick = () => {
    chrome.storage.sync.set({ focusActive: false }, () => {
      location.reload();
    });
  };

  panel.appendChild(timerText);
  panel.appendChild(pauseBtn);
  panel.appendChild(stopBtn);

  document.body.appendChild(panel);

  panel.timerText = timerText;
}

// ⏱️ TIMER
function startTimer(endTime) {
  const panel = document.querySelector(".fg-control-panel");
  const timerText = panel?.timerText;

  timerInterval = setInterval(() => {
    if (paused) return;

    const rem = endTime - Date.now();

    if (rem <= 0) {
      clearInterval(timerInterval);
      if (timerText) timerText.innerText = "⏰ Done!";
      return;
    }

    const m = Math.floor(rem / 60000);
    const s = Math.floor((rem % 60000) / 1000);

    if (timerText) {
      timerText.innerText = `⏱ ${m}:${s.toString().padStart(2, "0")}`;
    }

  }, 1000);
}
function detectAndRemoveNavbar() {
  const elements = document.querySelectorAll("body *");

  elements.forEach(el => {
    const rect = el.getBoundingClientRect();

    // 🧠 Heuristics for navbar detection
    const isTop = rect.top < 150; // near top
    const isWide = rect.width > window.innerWidth * 0.7;
    const hasManyLinks = el.querySelectorAll("a, button").length > 3;
    const isHorizontal = rect.height < 120;

    const style = window.getComputedStyle(el);
    const isFixed =
      style.position === "fixed" || style.position === "sticky";

    if (isTop && isWide && hasManyLinks && isHorizontal && isFixed) {
      hideNavbar(el);
    }
  });
}
function hideNavbar(el) {
  el.style.display = "none";

  console.log("🚫 Navbar removed:", el);
}