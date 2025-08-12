// app.js — robust SPA frontend with safe MetaMask handling and mock analysis
(() => {
  const qs = (s) => document.querySelector(s);
  const videoUrlInput = qs("#videoUrl");
  const previewBtn = qs("#previewBtn");
  const analyzeBtn = qs("#analyzeBtn");
  const resetBtn = qs("#resetBtn");
  const status = qs("#status");
  const player = qs("#player");
  const results = qs("#analysisResults");
  const connectWalletBtn = qs("#connectWalletBtn");
  const walletInfo = qs("#walletInfo");

  // --- MetaMask / Wallet helpers (safe) ---
  function hasMetaMask() {
    return (
      typeof window !== "undefined" && typeof window.ethereum !== "undefined"
    );
  }

  function shortAddress(addr) {
    if (!addr) return "";
    return addr.slice(0, 6) + "..." + addr.slice(-4);
  }

  async function connectWallet() {
    // Only try to connect on explicit user action (button click)
    if (!hasMetaMask()) {
      status.textContent =
        "MetaMask not detected. Install MetaMask or use a browser extension that injects window.ethereum.";
      walletInfo.textContent = "No MetaMask";
      return;
    }

    try {
      // Request accounts — this will open MetaMask UI in supported browsers
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const account = accounts && accounts[0];
      walletInfo.textContent = account ? shortAddress(account) : "Connected";
      status.textContent =
        "MetaMask connected — " +
        (account ? shortAddress(account) : "connected");

      // Listen for account changes and update UI
      window.ethereum.on &&
        window.ethereum.on("accountsChanged", (accs) => {
          if (accs && accs.length) {
            walletInfo.textContent = shortAddress(accs[0]);
            status.textContent = "Account changed";
          } else {
            walletInfo.textContent = "Not connected";
            status.textContent = "MetaMask disconnected";
          }
        });
    } catch (err) {
      // User rejected or other error — catch and show friendly message
      console.error("Failed to connect to MetaMask", err);
      status.textContent =
        "Failed to connect to MetaMask: " +
        (err && err.message ? err.message : err);
      walletInfo.textContent = "Not connected";
    }
  }

  connectWalletBtn.addEventListener("click", connectWallet);

  // --- Video preview helpers ---
  function clearPlayer() {
    while (player.firstChild) player.removeChild(player.firstChild);
    player.textContent = "Video preview will appear here";
  }

  function isYouTube(url) {
    try {
      const u = new URL(url);
      return /youtube\.com|youtu\.be/.test(u.hostname);
    } catch (e) {
      return false;
    }
  }

  function parseYouTubeId(url) {
    try {
      // cover urls like: youtu.be/ID , youtube.com/watch?v=ID, youtube.com/embed/ID, etc.
      const m = url.match(
        /(?:youtube(?:-nocookie)?\.com\/(?:.*v=|embed\/)|youtu\.be\/)([\w-]{11})/
      );
      return m ? m[1] : null;
    } catch (e) {
      return null;
    }
  }

  previewBtn.addEventListener("click", () => {
    const url = videoUrlInput.value.trim();
    if (!url) {
      status.textContent = "Please paste a video URL first.";
      return;
    }

    clearPlayer();
    status.textContent = "Loading preview...";

    if (isYouTube(url)) {
      const id = parseYouTubeId(url) || "";
      if (!id) {
        status.textContent =
          "Could not parse YouTube ID. Please paste a full YouTube URL.";
        return;
      }
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
      iframe.width = "100%";
      iframe.height = "100%";
      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;
      iframe.style.border = "0";
      player.textContent = "";
      player.appendChild(iframe);
      status.textContent = "YouTube preview loaded.";
      return;
    }

    // Plain video element
    try {
      const video = document.createElement("video");
      video.controls = true;
      video.width = 720;
      video.preload = "metadata";
      // Don't set crossOrigin unless required by your backend; keep default to avoid complications
      video.src = url;
      video.onloadedmetadata = () => {
        status.textContent = "Video loaded — you can play or analyze it.";
      };
      video.onerror = (e) => {
        status.textContent =
          "Failed to load the video (CORS or invalid URL). Try a different link or a direct mp4.";
        console.error("Video load error", e);
      };
      player.textContent = "";
      player.appendChild(video);
    } catch (err) {
      status.textContent =
        "Could not create video preview: " +
        (err && err.message ? err.message : err);
      console.error(err);
    }
  });

  // Samples (serve as simple test cases the user can press)
  document.querySelectorAll(".sample").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      const url = e.currentTarget.getAttribute("data-url");
      videoUrlInput.value = url;
      previewBtn.click();
    })
  );

  // --- Mock analysis (deterministic for same URL) ---
  function seededRandom(seed) {
    let s = seed | 0;
    return () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  function fakeDetect(url) {
    let seed = 0;
    for (let i = 0; i < url.length; i++)
      seed = (seed * 31 + url.charCodeAt(i)) | 0;
    const rand = seededRandom(seed);
    const people = [
      "Alex",
      "Maya",
      "Omar",
      "Lina",
      "Noor",
      "Sam",
      "Zara",
      "Ibrahim",
    ];
    const n = Math.max(1, Math.floor(rand() * 5));
    const out = [];
    for (let i = 0; i < n; i++) {
      const person = people[Math.floor(rand() * people.length)];
      const start = Math.floor(rand() * 90);
      const duration = 1 + Math.floor(rand() * 6);
      const confidence = Math.floor(60 + rand() * 40);
      out.push({ person, start, duration, confidence });
    }
    return out;
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  function showResults(items) {
    results.innerHTML = "";
    if (!items || !items.length) {
      results.innerHTML = '<div class="empty">No people detected.</div>';
      return;
    }
    items.forEach((it) => {
      const el = document.createElement("div");
      el.className = "result-card";
      el.innerHTML = `
        <div>
          <strong>${it.person}</strong>
          <div class="muted">Appears at ${formatTime(it.start)} for ${
        it.duration
      }s</div>
        </div>
        <div><span class="badge">${it.confidence}%</span></div>
      `;
      results.appendChild(el);
    });
  }

  analyzeBtn.addEventListener("click", async () => {
    const url = videoUrlInput.value.trim();
    if (!url) {
      status.textContent = "Paste a video URL first.";
      return;
    }

    status.textContent = "Analyzing — reading the video soul...";
    results.innerHTML =
      '<div class="result-card">Analyzing... <span id="dots">.</span></div>';
    let dots = 0;
    const dotsEl = results.querySelector("#dots");
    const int = setInterval(() => {
      if (dotsEl) dotsEl.textContent = ".".repeat(++dots % 4);
    }, 400);

    // Simulate compute/network delay
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 1000));
    clearInterval(int);

    try {
      const detections = fakeDetect(url);
      const avg = Math.round(
        detections.reduce((a, b) => a + b.confidence, 0) / detections.length ||
          0
      );
      if (avg > 88)
        status.textContent = `Analysis complete — ${detections.length} people (avg ${avg}%)`;
      else
        status.textContent = `Analysis complete — ${detections.length} people (avg ${avg}%)`;
      showResults(detections);
    } catch (err) {
      console.error("Analyze failed", err);
      status.textContent =
        "Analysis failed: " + (err && err.message ? err.message : err);
      results.innerHTML = '<div class="empty">Analysis failed</div>';
    }
  });

  // Reset
  resetBtn.addEventListener("click", () => {
    videoUrlInput.value = "";
    clearPlayer();
    results.innerHTML = '<div class="empty">No results yet</div>';
    status.textContent = "Reset to initial state.";
    walletInfo.textContent = "Not connected";
  });

  // --- Small helpful developer test harness (optional manual test runner) ---
  // Pressing Ctrl+Shift+T will run preview+analyze for the first sample to help debug quickly.
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "t") {
      const sampleBtn = document.querySelector(".sample");
      if (sampleBtn) {
        sampleBtn.click();
        setTimeout(() => analyzeBtn.click(), 600);
      }
    }
  });
})();
