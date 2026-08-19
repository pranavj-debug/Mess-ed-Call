/* ═══════════════════════════════════════════════════════════════
   MESS'ED CALL — app.js
   Full client-side state engine, QR renderer, Maps integration
═══════════════════════════════════════════════════════════════ */

// ─── GOOGLE MAPS API KEY ────────────────────────────────────────
const GOOGLE_MAPS_API_KEY = "YOUR_API_KEY_HERE";

// ─── STUDENT ROSTER (for simulation) ───────────────────────────
const STUDENT_ROSTER = [
  { name: "Rahul Sharma",    id: "2022A7PS0001" },
  { name: "Amit Verma",      id: "2022A7PS0082" },
  { name: "Priya Nair",      id: "2023A3PS0114" },
  { name: "Sneha Iyer",      id: "2021A4PS0230" },
  { name: "Rohan Desai",     id: "2022B2PS0089" },
  { name: "Karthik Menon",   id: "2023A1PS0045" },
  { name: "Divya Reddy",     id: "2022A7PS0167" },
  { name: "Aayush Gupta",    id: "2021B3PS0302" },
  { name: "Meera Pillai",    id: "2023A2PS0078" },
  { name: "Tanvir Shaikh",   id: "2022A5PS0199" },
];

// ─── MESS DATA ──────────────────────────────────────────────────
const MESS_DATA = [
  {
    id: "mess-a",
    name: "Green Campus Kitchen",
    emoji: "🍱",
    rating: 4.85,
    distance: "120m",
    isOpen: true,
    walkInPlates: 20,
    walkInMax: 20,
    lat: 28.3671, lng: 73.3239,
    isVendorMess: true,
    menu: [
      { name: "Dal Tadka",         emoji: "🫕", type: "veg" },
      { name: "Jeera Rice",        emoji: "🍚", type: "veg" },
      { name: "Aloo Gobi Sabzi",   emoji: "🥔", type: "veg" },
      { name: "Tandoori Roti",     emoji: "🫓", type: "veg" },
      { name: "Chicken Curry",     emoji: "🍗", type: "nonveg" },
      { name: "Mango Raita",       emoji: "🥭", type: "veg" },
      { name: "Gulab Jamun",       emoji: "🍮", type: "veg" },
    ],
  },
  {
    id: "mess-b",
    name: "Shanti Mess",
    emoji: "🍛",
    rating: 4.60,
    distance: "350m",
    isOpen: true,
    walkInPlates: 14,
    walkInMax: 25,
    lat: 28.3685, lng: 73.3255,
    isVendorMess: false,
    menu: [
      { name: "Rajma Masala",    emoji: "🫘", type: "veg" },
      { name: "Steamed Rice",    emoji: "🍚", type: "veg" },
      { name: "Palak Paneer",    emoji: "🥬", type: "veg" },
      { name: "Missi Roti",      emoji: "🫓", type: "veg" },
      { name: "Mixed Raita",     emoji: "🥛", type: "veg" },
      { name: "Kheer",           emoji: "🍮", type: "veg" },
    ],
  },
  {
    id: "mess-c",
    name: "Rajdhani Thali",
    emoji: "🥘",
    rating: 4.40,
    distance: "620m",
    isOpen: true,
    walkInPlates: 8,
    walkInMax: 15,
    lat: 28.3658, lng: 73.3270,
    isVendorMess: false,
    menu: [
      { name: "Paneer Butter Masala", emoji: "🧀", type: "veg" },
      { name: "Butter Naan",          emoji: "🫓", type: "veg" },
      { name: "Dal Makhani",          emoji: "🫕", type: "veg" },
      { name: "Mutton Korma",         emoji: "🥩", type: "nonveg" },
      { name: "Fried Rice",           emoji: "🍚", type: "veg" },
    ],
  },
  {
    id: "mess-d",
    name: "Vrindavan Mess",
    emoji: "🫕",
    rating: 4.20,
    distance: "870m",
    isOpen: false,
    walkInPlates: 0,
    walkInMax: 12,
    lat: 28.3640, lng: 73.3210,
    isVendorMess: false,
    menu: [
      { name: "Chole Bhature",   emoji: "🫘", type: "veg" },
      { name: "Lassi",           emoji: "🥛", type: "veg" },
      { name: "Poha",            emoji: "🍚", type: "veg" },
      { name: "Halwa Puri",      emoji: "🍮", type: "veg" },
    ],
  },
];

// ─── APP STATE ──────────────────────────────────────────────────
const AppState = {
  contractMealsToday: 0,
  walkInAvailable: 20,
  walkInMax: 20,
  recentlyEaten: [],
  tokenCounter: 0,
  messes: JSON.parse(JSON.stringify(MESS_DATA)), // deep clone
  mapInstance: null,
  directionsService: null,
  directionsRenderer: null,
  mapMarkers: [],
  userLocation: { lat: 28.3650, lng: 73.3220 },
  activeQRToken: null,
};

// ─── DOM REFS ───────────────────────────────────────────────────
const dom = {
  contractCount:      () => document.getElementById("contract-count"),
  walkinCount:        () => document.getElementById("walkin-count"),
  walkinProgress:     () => document.getElementById("walkin-progress"),
  walkinStatusText:   () => document.getElementById("walkin-status-text"),
  feedTbody:          () => document.getElementById("feed-tbody"),
  feedEmptyRow:       () => document.getElementById("feed-empty-row"),
  feedCountBadge:     () => document.getElementById("feed-count-badge"),
  qrModalOverlay:     () => document.getElementById("qr-modal-overlay"),
  qrCanvas:           () => document.getElementById("qr-canvas"),
  qrLoadingRing:      () => document.getElementById("qr-loading-ring"),
  tokenIdDisplay:     () => document.getElementById("token-id-display"),
  tokenDateDisplay:   () => document.getElementById("token-date-display"),
  menuModalOverlay:   () => document.getElementById("menu-modal-overlay"),
  menuMessName:       () => document.getElementById("menu-mess-name"),
  menuModalEmoji:     () => document.getElementById("menu-modal-emoji"),
  menuChecklist:      () => document.getElementById("menu-checklist"),
  menuDateTag:        () => document.getElementById("menu-date-tag"),
  messCardsList:      () => document.getElementById("mess-cards-list"),
  rerouteToast:       () => document.getElementById("reroute-toast"),
  toastMsg:           () => document.getElementById("toast-msg"),
  toastCloseBtn:      () => document.getElementById("toast-close-btn"),
  liveClock:          () => document.getElementById("live-clock"),
  liveDate:           () => document.getElementById("live-date"),
  mapPlaceholder:     () => document.getElementById("map-placeholder"),
};

// ─── UTILITIES ──────────────────────────────────────────────────
function nowTimeStr() {
  const d = new Date();
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function nowDateStr() {
  const d = new Date();
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}
function padNum(n, len = 4) { return String(n).padStart(len, "0"); }
function animateCounter(el) {
  el.classList.remove("counter-pop");
  void el.offsetWidth;
  el.classList.add("counter-pop");
}
function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── LIVE CLOCK ─────────────────────────────────────────────────
function tickClock() {
  const d = new Date();
  dom.liveClock().textContent = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  dom.liveDate().textContent = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}
setInterval(tickClock, 1000);
tickClock();

// ─── QR CODE RENDERER ───────────────────────────────────────────
// Pure-canvas QR-style graphic (no external lib needed for demo)
function drawQROnCanvas(canvas, tokenStr) {
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);

  // Background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, size, size);

  // Deterministic noise grid from token string
  const cellSize = 10;
  const cols = Math.floor(size / cellSize);
  const rows = Math.floor(size / cellSize);
  let seed = 0;
  for (let i = 0; i < tokenStr.length; i++) seed += tokenStr.charCodeAt(i) * (i + 1);

  function seededRand(x, y) {
    const n = Math.sin(seed + x * 127.1 + y * 311.7) * 43758.5453123;
    return n - Math.floor(n);
  }

  // Draw QR-like grid
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const val = seededRand(c, r);
      // Leave corners blank for position markers
      const inCornerTL = c < 8 && r < 8;
      const inCornerTR = c >= cols - 8 && r < 8;
      const inCornerBL = c < 8 && r >= rows - 8;
      if (inCornerTL || inCornerTR || inCornerBL) continue;
      if (val > 0.45) {
        ctx.fillStyle = "#1C1C2E";
        ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, cellSize - 2);
      }
    }
  }

  // Draw position finder squares (3 corners)
  function drawFinder(cx, cy) {
    const s = cellSize;
    // Outer black square
    ctx.fillStyle = "#1C1C2E";
    ctx.fillRect(cx, cy, s * 7, s * 7);
    // White inner
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(cx + s, cy + s, s * 5, s * 5);
    // Black center
    ctx.fillStyle = "#1C1C2E";
    ctx.fillRect(cx + s * 2, cy + s * 2, s * 3, s * 3);
  }
  drawFinder(0, 0);
  drawFinder((cols - 7) * cellSize, 0);
  drawFinder(0, (rows - 7) * cellSize);

  // Orange accent line at bottom
  ctx.fillStyle = "#FC8019";
  ctx.fillRect(0, size - 6, size, 6);

  // Token text watermark
  ctx.fillStyle = "rgba(28,28,46,0.25)";
  ctx.font = "bold 9px monospace";
  ctx.textAlign = "center";
  ctx.fillText(tokenStr, size / 2, size - 12);
}

// ─── QR MODAL ───────────────────────────────────────────────────
function openQRModal() {
  AppState.tokenCounter += 1;
  const tokenStr = `MC-${padNum(AppState.tokenCounter)}-${nowDateStr().replace(/[, ]/g, "").toUpperCase()}`;
  AppState.activeQRToken = tokenStr;

  dom.tokenIdDisplay().textContent = `TOKEN #${padNum(AppState.tokenCounter)}`;
  dom.tokenDateDisplay().textContent = `${nowDateStr()} — ${nowTimeStr()}`;

  // Show ring, then draw QR
  dom.qrLoadingRing().classList.remove("hidden");
  const canvas = dom.qrCanvas();
  canvas.style.opacity = "0";

  setTimeout(() => {
    drawQROnCanvas(canvas, tokenStr);
    canvas.style.transition = "opacity 0.3s";
    canvas.style.opacity = "1";
    dom.qrLoadingRing().classList.add("hidden");
  }, 600);

  dom.qrModalOverlay().classList.add("active");
}

function closeQRModal() {
  dom.qrModalOverlay().classList.remove("active");
}

// ─── SIMULATE SCAN ──────────────────────────────────────────────
function simulateScan() {
  closeQRModal();

  const student = randomFrom(STUDENT_ROSTER);
  const token = AppState.activeQRToken || `MC-${padNum(AppState.tokenCounter)}`;

  // Update state
  AppState.contractMealsToday += 1;

  // Update counter
  const el = dom.contractCount();
  el.textContent = AppState.contractMealsToday;
  animateCounter(el);

  // Log to feed
  addFeedRow(student.name, token, nowTimeStr());
}

// ─── FEED TABLE ─────────────────────────────────────────────────
function addFeedRow(studentName, token, time) {
  const tbody = dom.feedTbody();
  const emptyRow = dom.feedEmptyRow();
  if (emptyRow) emptyRow.remove();

  const idx = AppState.recentlyEaten.length + 1;
  AppState.recentlyEaten.unshift({ name: studentName, token, time });

  const tr = document.createElement("tr");
  tr.className = "feed-new-row";
  tr.innerHTML = `
    <td>${idx}</td>
    <td class="feed-student-name">${studentName}</td>
    <td class="feed-token">${token}</td>
    <td class="feed-time">${time}</td>
  `;
  tbody.insertBefore(tr, tbody.firstChild);

  dom.feedCountBadge().textContent = AppState.recentlyEaten.length;
}

// ─── CONTRACT MINUS ─────────────────────────────────────────────
function contractMinus() {
  if (AppState.contractMealsToday <= 0) return;
  AppState.contractMealsToday -= 1;
  const el = dom.contractCount();
  el.textContent = AppState.contractMealsToday;
  animateCounter(el);
}

// ─── WALK-IN POOL ───────────────────────────────────────────────
const WALKIN_MAX = 20;

function updateWalkInUI() {
  const count = AppState.walkInAvailable;
  const el = dom.walkinCount();
  el.textContent = count;
  animateCounter(el);

  const pct = Math.max(0, (count / WALKIN_MAX) * 100);
  const bar = dom.walkinProgress();
  bar.style.width = pct + "%";

  if (count <= 0) {
    bar.classList.add("danger");
    dom.walkinStatusText().textContent = "Sold out!";
  } else if (count <= 5) {
    bar.classList.add("danger");
    dom.walkinStatusText().textContent = `Only ${count} left — hurry!`;
  } else {
    bar.classList.remove("danger");
    dom.walkinStatusText().textContent = count >= WALKIN_MAX ? "Fully stocked" : `${count} of ${WALKIN_MAX} remaining`;
  }

  // Sync vendor mess (mess-a) consumer card
  const vendorMess = AppState.messes.find(m => m.isVendorMess);
  if (vendorMess) {
    vendorMess.walkInPlates = count;
    renderMessCards();
    if (count <= 0) triggerSoldOutFlow(vendorMess);
  }
}

function walkinPlus() {
  AppState.walkInAvailable = Math.min(AppState.walkInAvailable + 1, WALKIN_MAX);
  updateWalkInUI();
}

function walkinMinus() {
  if (AppState.walkInAvailable <= 0) return;
  AppState.walkInAvailable -= 1;
  updateWalkInUI();
}

// ─── SOLD OUT FLOW ──────────────────────────────────────────────
let rerouteShown = false;
function triggerSoldOutFlow(soldMess) {
  if (rerouteShown) return;
  rerouteShown = true;

  // Find next available mess
  const nextMess = AppState.messes.find(m => !m.isVendorMess && m.isOpen && m.walkInPlates > 0);
  const nextName = nextMess ? nextMess.name : "Shanti Mess";
  const nextRating = nextMess ? nextMess.rating.toFixed(1) : "4.6";
  const nextDist = nextMess ? nextMess.distance : "350m";

  dom.toastMsg().textContent =
    `${soldMess.name} walk-in plates are finished! Automatically rerouting your search to ${nextName} (${nextRating}★) — ${nextDist} away with food available!`;

  const toast = dom.rerouteToast();
  toast.classList.add("visible");

  // Auto-hide after 8 seconds
  setTimeout(() => toast.classList.remove("visible"), 8000);
}

function resetReroute() {
  rerouteShown = false;
  dom.rerouteToast().classList.remove("visible");
}

// ─── MESS CARDS RENDERER ────────────────────────────────────────
function renderMessCards() {
  const container = dom.messCardsList();
  if (!container) return;

  container.innerHTML = "";
  AppState.messes.forEach(mess => {
    const isSoldOut = mess.isOpen && mess.walkInPlates === 0;
    const isClosedFully = !mess.isOpen;

    const card = document.createElement("div");
    card.className = "mess-card" + (isSoldOut ? " sold-out-card" : "");
    card.id = `card-${mess.id}`;
    card.setAttribute("data-mess-id", mess.id);

    if (isSoldOut) {
      card.innerHTML = `
        <div class="sold-out-badge">🚫 Sold Out for Walk-Ins</div>
        <div class="mess-card-emoji">${mess.emoji}</div>
        <div class="mess-card-body">
          <div class="mess-card-top">
            <div class="mess-card-name">${mess.name}</div>
            <div class="open-badge closed"><span class="badge-dot closed"></span>Walk-In Full</div>
          </div>
          <div class="mess-card-meta">
            <div class="mess-meta-pill"><span class="star">★</span><span class="mess-rating-val">${mess.rating.toFixed(2)}</span></div>
            <div class="mess-meta-pill">📍 ${mess.distance}</div>
            <div class="mess-meta-pill"><span class="walkin-pill-count">0</span><span class="walkin-pill-label">&nbsp;walk-in plates</span></div>
          </div>
          <div class="mess-card-actions">
            <button class="btn-menu" onclick="openMenuModal('${mess.id}')">📋 Today's Menu</button>
            <button class="btn-navigate" onclick="navigateTo('${mess.id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Navigate
            </button>
          </div>
        </div>`;
      card.style.cssText = "filter:blur(2px);opacity:0.5;position:relative;";
      const badge = card.querySelector(".sold-out-badge");
      if (badge) { badge.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(239,68,68,0.14);border:2px solid rgba(239,68,68,0.4);border-radius:14px;z-index:5;font-size:0.78rem;font-weight:800;color:#EF4444;text-transform:uppercase;letter-spacing:1.5px;pointer-events:none;"; }
    } else {
      const openLabel = isClosedFully ? "Closed" : "Open";
      const openClass = isClosedFully ? "closed" : "open";
      card.innerHTML = `
        <div class="mess-card-emoji">${mess.emoji}</div>
        <div class="mess-card-body">
          <div class="mess-card-top">
            <div class="mess-card-name">${mess.name}</div>
            <div class="open-badge ${openClass}"><span class="badge-dot ${openClass}"></span>${openLabel}</div>
          </div>
          <div class="mess-card-meta">
            <div class="mess-meta-pill"><span class="star">★</span><span class="mess-rating-val">${mess.rating.toFixed(2)}</span></div>
            <div class="mess-meta-pill">📍 ${mess.distance}</div>
            <div class="mess-meta-pill"><span class="walkin-pill-count">${mess.walkInPlates}</span><span class="walkin-pill-label">&nbsp;walk-in plates</span></div>
          </div>
          <div class="mess-card-actions">
            <button class="btn-menu" onclick="openMenuModal('${mess.id}')">📋 Today's Menu</button>
            <button class="btn-navigate" onclick="navigateTo('${mess.id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Navigate
            </button>
          </div>
        </div>`;
    }
    container.appendChild(card);
  });
}

// ─── MENU MODAL ─────────────────────────────────────────────────
function openMenuModal(messId) {
  const mess = AppState.messes.find(m => m.id === messId);
  if (!mess) return;

  dom.menuMessName().textContent = mess.name;
  dom.menuModalEmoji().textContent = mess.emoji;
  dom.menuDateTag().textContent = nowDateStr();

  const ul = dom.menuChecklist();
  ul.innerHTML = "";
  mess.menu.forEach(item => {
    const li = document.createElement("li");
    li.className = "menu-item";
    li.innerHTML = `
      <span class="menu-item-emoji">${item.emoji}</span>
      <span class="menu-item-name">${item.name}</span>
      <span class="menu-item-type type-${item.type}">${item.type === "veg" ? "Veg" : "Non-Veg"}</span>`;
    ul.appendChild(li);
  });

  dom.menuModalOverlay().classList.add("active");
}

function closeMenuModal() {
  dom.menuModalOverlay().classList.remove("active");
}

// ─── GOOGLE MAPS ─────────────────────────────────────────────────
function initMap() {
  try {
    const mapEl = document.getElementById("map-canvas");
    const placeholder = dom.mapPlaceholder();

    const map = new google.maps.Map(mapEl, {
      center: AppState.userLocation,
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
        { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
        { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9e8f5" }] },
      ],
    });

    AppState.mapInstance = map;
    AppState.directionsService = new google.maps.DirectionsService();
    AppState.directionsRenderer = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: false,
      polylineOptions: { strokeColor: "#FC8019", strokeWeight: 5, strokeOpacity: 0.85 },
    });

    // User marker
    new google.maps.Marker({
      position: AppState.userLocation,
      map,
      title: "Your Location",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: "#2563EB",
        fillOpacity: 1,
        strokeColor: "#FFFFFF",
        strokeWeight: 3,
      },
    });

    // Mess markers
    AppState.messes.forEach(mess => {
      const marker = new google.maps.Marker({
        position: { lat: mess.lat, lng: mess.lng },
        map,
        title: mess.name,
        label: { text: mess.emoji || "🍱", fontSize: "20px" },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 16,
          fillColor: mess.isVendorMess ? "#FC8019" : "#FFFFFF",
          fillOpacity: 1,
          strokeColor: "#FC8019",
          strokeWeight: 2.5,
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="font-family:Inter,sans-serif;padding:4px 6px">
          <strong style="font-size:13px;color:#282C3F">${mess.name}</strong><br>
          <span style="color:#FC8019;font-weight:700">★ ${mess.rating.toFixed(2)}</span>
          &nbsp;·&nbsp;<span style="color:#686B78;font-size:12px">${mess.distance}</span><br>
          <span style="font-size:12px;color:#22C55E;font-weight:600">${mess.walkInPlates} walk-in plates</span>
        </div>`,
      });

      marker.addListener("click", () => infoWindow.open(map, marker));
      AppState.mapMarkers.push({ marker, mess });
    });

    // Hide placeholder when map loads
    if (placeholder) placeholder.style.display = "none";
  } catch (e) {
    console.warn("Maps init error:", e);
  }
}

function handleMapError() {
  console.warn("Google Maps API failed to load. Using visual placeholder.");
}

function navigateTo(messId) {
  const mess = AppState.messes.find(m => m.id === messId);
  if (!mess) return;

  if (!AppState.mapInstance || !AppState.directionsService) {
    // Scroll to map and show placeholder hint
    const mapSection = document.querySelector(".map-section");
    if (mapSection) mapSection.scrollIntoView({ behavior: "smooth" });
    alert(`Navigation to ${mess.name} — Add a valid Google Maps API key in app.js to enable live routing.`);
    return;
  }

  const request = {
    origin: AppState.userLocation,
    destination: { lat: mess.lat, lng: mess.lng },
    travelMode: google.maps.TravelMode.WALKING,
  };

  AppState.directionsService.route(request, (result, status) => {
    if (status === "OK") {
      AppState.directionsRenderer.setDirections(result);
      const mapSection = document.querySelector(".map-section");
      if (mapSection) mapSection.scrollIntoView({ behavior: "smooth" });
    } else {
      alert(`Could not get walking route: ${status}`);
    }
  });
}

// ─── EVENT WIRING ───────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {

  // Vendor buttons
  document.getElementById("contract-plus-btn").addEventListener("click", openQRModal);
  document.getElementById("contract-minus-btn").addEventListener("click", contractMinus);
  document.getElementById("walkin-plus-btn").addEventListener("click", () => { walkinPlus(); rerouteShown = false; });
  document.getElementById("walkin-minus-btn").addEventListener("click", walkinMinus);

  // QR modal
  document.getElementById("qr-modal-close").addEventListener("click", closeQRModal);
  document.getElementById("simulate-scan-btn").addEventListener("click", simulateScan);
  document.getElementById("qr-modal-overlay").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeQRModal();
  });

  // Menu modal
  document.getElementById("menu-modal-close").addEventListener("click", closeMenuModal);
  document.getElementById("menu-modal-overlay").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeMenuModal();
  });

  // Toast dismiss
  document.getElementById("toast-close-btn").addEventListener("click", () => {
    dom.rerouteToast().classList.remove("visible");
  });

  // ESC closes modals
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { closeQRModal(); closeMenuModal(); }
  });

  // Initial render
  renderMessCards();
  tickClock();
});

// ─── EXPOSE TO GLOBAL (for initMap callback + inline handlers) ──
window.AppController = { initMap, handleMapError };
window.openMenuModal = openMenuModal;
window.navigateTo = navigateTo;
