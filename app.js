/* ═══════════════════════════════════════════════════════════════
   MESS'ED CALL — app.js
   Dynamic Nominatim API Search · Student Authentication
   Live GPS Tracking · OSRM Free Routing · Vendor Operations
═══════════════════════════════════════════════════════════════ */

// ─── 🗃️ GLOBAL CONFIGURATION MATRIX (Absolute Data Decoupling) ──────────────
const APP_CONFIG = {
  initialStates: {
    pinCode: "1234",
    defaultWalkInPlates: 20,
    defaultContractMeals: 0
  },
  mockStudents: [
    { studentId: "STU101", name: "Rahul Sharma", contractMessId: "mess-vendor", mealsRemaining: 30, hasEatenToday: false },
    { studentId: "STU102", name: "Amit Verma", contractMessId: "mess-vendor", mealsRemaining: 25, hasEatenToday: false },
    { studentId: "STU103", name: "Priya Nair", contractMessId: "none", mealsRemaining: 0, hasEatenToday: false },
    { studentId: "STU104", name: "Sneha Iyer", contractMessId: "mess-other", mealsRemaining: 15, hasEatenToday: false }
  ],
  dynamicMesses: [] // Populated by generateLocalMesses()
};

// ─── APPLICATION STATE ────────────────────────────────────────────────────────
const AppState = {
  currentRole: null,
  activeStudent: null, // Holds object from APP_CONFIG.mockStudents
  pinPanelOpen: false,
  studentPanelOpen: false,

  // Vendor State
  contractMealsToday: APP_CONFIG.initialStates.defaultContractMeals,
  recentlyEaten: [],
  tokenCounter: 0,
  activeQRToken: null,
  walkInAvailable: APP_CONFIG.initialStates.defaultWalkInPlates,
  walkInMax: APP_CONFIG.initialStates.defaultWalkInPlates,
  rerouteShown: false,

  // Consumer/Map State
  liveMesses: [], 
  activeLocationName: "Fetching...",
  leafletMap: null,
  leafletMarkers: [],
  routingControl: null,
  activeMessId: null,
  navMode: "foot", // "foot" | "bike" | "car"
  gpsCoords: null, // [lat, lng]
  gpsActive: false,
  isDevBypassMode: false,
  
  searchTimeout: null,
};

// ─── DOM ACCESSORS ────────────────────────────────────────────────────────────
const dom = {
  roleGateScreen:     () => document.getElementById("role-gate-screen"),
  customerView:       () => document.getElementById("customer-view"),
  vendorView:         () => document.getElementById("vendor-view"),
  gateOwnerBtn:       () => document.getElementById("gate-owner-btn"),
  gateCustomerBtn:    () => document.getElementById("gate-customer-btn"),
  pinPanel:           () => document.getElementById("pin-panel"),
  pinInput:           () => document.getElementById("pin-input"),
  studentPanel:       () => document.getElementById("student-login-panel"),
  studentIdInput:     () => document.getElementById("student-id-input"),
  contractIdInput:    () => document.getElementById("contract-id-input"),
  studentErrorMsg:    () => document.getElementById("student-error-msg"),
  pinErrorMsg:        () => document.getElementById("pin-error-msg"),
  contractCount:      () => document.getElementById("contract-count"),
  walkinCount:        () => document.getElementById("walkin-count"),
  walkinProgress:     () => document.getElementById("walkin-progress"),
  walkinStatusText:   () => document.getElementById("walkin-status-text"),
  walkinPctText:      () => document.getElementById("walkin-pct-text"),
  walkinSoldBanner:   () => document.getElementById("walkin-sold-indicator"),
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
  mapCanvas:          () => document.getElementById("map-canvas"),
  routeInfoBar:       () => document.getElementById("route-info-bar"),
  routeDestination:   () => document.getElementById("route-destination"),
  routeDistance:      () => document.getElementById("route-distance"),
  routeDuration:      () => document.getElementById("route-duration"),
  navModePills:       () => document.getElementById("nav-mode-pills"),
  collegeSearchInput: () => document.getElementById("college-search-input"),
  collegeSuggestions: () => document.getElementById("college-suggestions"),
  searchDropdown:     () => document.getElementById("search-results-dropdown"),
  searchLoader:       () => document.getElementById("search-loader"),
  currentCollegeName: () => document.getElementById("current-college-name"),
  gpsStatusPill:      () => document.getElementById("gps-status-pill"),
  gpsStatusText:      () => document.getElementById("gps-status-text"),
  navStudentAvatar:   () => document.getElementById("nav-student-avatar"),
  navStudentName:     () => document.getElementById("nav-student-name"),
  navStudentId:       () => document.getElementById("nav-student-id"),
  devBypassBtn:       () => document.getElementById("dev-bypass-btn"),
  pinSubmitBtn:       () => document.getElementById("pin-submit-btn"),
};

// ─── UTILITIES ────────────────────────────────────────────────────────────────
function nowTimeStr() { return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }); }
function nowDateStr() { return new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }); }
function padNum(n, len = 4) { return String(n).padStart(len, "0"); }
function escapeHtml(str) { const d = document.createElement("div"); d.appendChild(document.createTextNode(String(str))); return d.innerHTML; }
function animateCounter(el) { if (!el) return; el.classList.remove("counter-pop"); void el.offsetWidth; el.classList.add("counter-pop"); }
function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── DYNAMIC MESS GENERATION (Absolute Decoupling) ────────────────────────────
function generateLocalMesses(lat, lng, locationName) {
  AppState.activeLocationName = locationName;
  const nameEl = dom.currentCollegeName();
  if (nameEl) nameEl.textContent = locationName;

  // Generate 3 localized messes within ~5km radius using slight lat/lng offsets
  APP_CONFIG.dynamicMesses = [
    {
      id: "mess-vendor",
      name: "Owner's Primary Kitchen",
      emoji: "🍱",
      baselineRating: 4.85,
      distanceOffset: "120m",
      lat: lat + 0.003,
      lng: lng - 0.005,
      isVendorMess: true,
      isOpen: true,
      walkInPlates: AppState.walkInAvailable,
      menu: [
        { name: "Dal Tadka", emoji: "🫕", type: "veg" },
        { name: "Jeera Rice", emoji: "🍚", type: "veg" },
        { name: "Chicken Curry", emoji: "🍗", type: "nonveg" }
      ]
    },
    {
      id: "mess-other-1",
      name: "Student Thali Center",
      emoji: "🍛",
      baselineRating: 4.50,
      distanceOffset: "450m",
      lat: lat - 0.004,
      lng: lng + 0.002,
      isVendorMess: false,
      isOpen: true,
      walkInPlates: 15,
      menu: [
        { name: "Rajma Masala", emoji: "🫘", type: "veg" },
        { name: "Palak Paneer", emoji: "🥬", type: "veg" }
      ]
    },
    {
      id: "mess-other-2",
      name: "Late Night Bites",
      emoji: "🥘",
      baselineRating: 4.20,
      distanceOffset: "920m",
      lat: lat + 0.005,
      lng: lng + 0.006,
      isVendorMess: false,
      isOpen: true,
      walkInPlates: 5,
      menu: [
        { name: "Chole Bhature", emoji: "🫘", type: "veg" },
        { name: "Lassi", emoji: "🥛", type: "veg" }
      ]
    }
  ];

  AppState.liveMesses = APP_CONFIG.dynamicMesses;

  renderLeaderboard();
  renderMessCards();
  
  if (AppState.leafletMap) {
    AppState.leafletMap.setView([lat, lng], 14);
    updateLeafletMarkers();
  }
}

// ─── VIEW ROUTER ──────────────────────────────────────────────────────────────
function showView(viewName) {
  const gateEl = dom.roleGateScreen();
  const custEl = dom.customerView();
  const vendEl = dom.vendorView();

  // Clean CSS state class manipulation for forcing DOM visibility
  if (gateEl) {
    gateEl.style.display = "none";
  }
  if (custEl) { 
    custEl.classList.remove("active"); 
    custEl.setAttribute("aria-hidden", "true"); 
    custEl.style.display = ""; // Clear any inline blocks 
  }
  if (vendEl) { 
    vendEl.classList.remove("active"); 
    vendEl.setAttribute("aria-hidden", "true"); 
    vendEl.style.display = ""; 
  }
  
  window.scrollTo(0, 0);

  if (viewName === "gate") {
    if (gateEl) gateEl.style.display = "flex";
  } else if (viewName === "customer") {
    if (custEl) { 
      custEl.classList.add("active"); 
      custEl.removeAttribute("aria-hidden"); 
      custEl.style.display = "flex"; // Hard force visibility
    }
    
    // Set Profile
    if (AppState.activeStudent) {
      dom.navStudentName().textContent = AppState.activeStudent.name;
      dom.navStudentId().textContent = AppState.activeStudent.studentId;
      dom.navStudentAvatar().textContent = AppState.activeStudent.name.charAt(0);
    }
    
    // Bypass GPS completely if in Dev Bypass mode to prevent freezing
    if (AppState.isDevBypassMode) {
      const pill = dom.gpsStatusPill(); if (pill) pill.className = "live-pill";
      const text = dom.gpsStatusText(); if (text) text.textContent = "GPS MOCKED";
      generateLocalMesses(19.1334, 72.9133, "DEV BYPASS MOCK LOCATION");
      initLeafletMap();
    } else {
      startGPSStream(); // Initiates GPS -> Map -> generateLocalMesses
    }

  } else if (viewName === "vendor") {
    if (vendEl) { 
      vendEl.classList.add("active"); 
      vendEl.removeAttribute("aria-hidden"); 
      vendEl.style.display = "flex"; // Hard force visibility
    }
  }
}

// ─── ROLE GATE & AUTHENTICATION ───────────────────────────────────────────────
function showOwnerPanel() {
  AppState.pinPanelOpen = true;
  AppState.studentPanelOpen = false;
  dom.pinPanel()?.classList.add("open");
  dom.studentPanel()?.classList.remove("open");
  dom.gateOwnerBtn()?.classList.add("selected");
  dom.gateCustomerBtn()?.classList.remove("selected");
  setTimeout(() => dom.pinInput()?.focus(), 300);
}

function showCustomerPanel() {
  AppState.studentPanelOpen = true;
  AppState.pinPanelOpen = false;
  dom.studentPanel()?.classList.add("open");
  dom.pinPanel()?.classList.remove("open");
  dom.gateCustomerBtn()?.classList.add("selected");
  dom.gateOwnerBtn()?.classList.remove("selected");
  setTimeout(() => dom.studentIdInput()?.focus(), 300);
}

function submitOwnerPin() {
  const input = dom.pinInput();
  if (!input) return;
  if (input.value.trim() === APP_CONFIG.initialStates.pinCode) {
    input.style.borderColor = "#22C55E";
    input.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.2)";
    dom.pinErrorMsg().textContent = "";
    setTimeout(() => {
      AppState.currentRole = "owner";
      showView("vendor");
      input.value = ""; input.style.borderColor = ""; input.style.boxShadow = "";
    }, 300);
  } else {
    input.classList.add("error");
    dom.pinErrorMsg().textContent = "Incorrect PIN. Try again.";
    setTimeout(() => input.classList.remove("error"), 500);
    input.value = ""; input.focus();
  }
}

function submitStudentLogin() {
  const idInput = dom.studentIdInput();
  if (!idInput) return;
  const idVal = idInput.value.trim().toUpperCase();
  if (!idVal) return;
  
  let student = APP_CONFIG.mockStudents.find(s => s.studentId === idVal);
  
  // AUTO-REGISTRATION FAIL-SAFE LOGIC
  if (!student) {
    student = {
      studentId: idVal,
      name: idVal,
      contractMessId: "MESS_A",
      mealsRemaining: 30,
      hasEatenToday: false
    };
    APP_CONFIG.mockStudents.push(student);
  }
  
  idInput.style.borderColor = "#22C55E";
  const errEl = dom.studentErrorMsg();
  if (errEl) errEl.textContent = "";
  
  setTimeout(() => {
    AppState.activeStudent = student;
    AppState.currentRole = "customer";
    AppState.isDevBypassMode = false;
    showView("customer");
    idInput.value = ""; 
    const contractInput = dom.contractIdInput();
    if (contractInput) contractInput.value = ""; 
    idInput.style.borderColor = "";
  }, 300);
}

// ─── IRONCLAD DEVELOPER BYPASS ────────────────────────────────────────────────
function executeDevBypass() {
  // 1. Instantly hide the Role Gate unconditionally
  const gateEl = dom.roleGateScreen();
  if (gateEl) gateEl.style.display = "none";
  
  // 2. Automatically initialize a valid global user session object
  const devSession = { 
    studentId: "DEV_GUEST", 
    name: "Developer Mode User", 
    contractMessId: "MESS_A", 
    mealsRemaining: 99, 
    hasEatenToday: false 
  };
  
  // 3. Inject it into the state array & set active session
  APP_CONFIG.mockStudents.push(devSession);
  AppState.activeStudent = devSession;
  AppState.currentRole = "customer";
  
  // 4. Set bypass flag to skip geolocation blocking
  AppState.isDevBypassMode = true;
  
  // 5. Force the dashboard containers to render
  showView("customer");
}

function logout() {
  AppState.currentRole = null;
  AppState.pinPanelOpen = false;
  AppState.studentPanelOpen = false;
  AppState.isDevBypassMode = false;
  
  dom.pinPanel()?.classList.remove("open");
  dom.studentPanel()?.classList.remove("open");
  dom.gateOwnerBtn()?.classList.remove("selected");
  dom.gateCustomerBtn()?.classList.remove("selected");
  showView("gate");
}

// ─── LOCAL BACKEND COLLEGE SEARCH (Partial-match against colleges.json) ───────
function initAPISearch() {
  const input    = dom.collegeSearchInput();
  const dropdown = dom.searchDropdown();
  const loader   = dom.searchLoader();
  if (!input || !dropdown) return;

  /**
   * Hides the dropdown and clears its content.
   */
  function closeDropdown() {
    dropdown.classList.remove("open");
    dropdown.innerHTML = "";
  }

  /**
   * Renders fetched college rows into the dropdown.
   * Each row is a <button> with college name (bold) + district beneath it.
   * Clicking a row: fills input, closes dropdown, geocodes via Nominatim,
   * pans map, and calls generateLocalMesses().
   */
  function renderDropdown(data) {
    dropdown.innerHTML = "";

    if (!data || data.length === 0) {
      const empty = document.createElement("div");
      empty.className = "suggestion-row-empty";
      empty.textContent = "No colleges found. Try different keywords.";
      dropdown.appendChild(empty);
      dropdown.classList.add("open");
      return;
    }

    data.forEach(item => {
      const btn = document.createElement("button");
      btn.type      = "button";
      btn.className = "suggestion-row";
      btn.setAttribute("role", "option");
      btn.innerHTML = `
        <span class="sug-name">${escapeHtml(item.institute_name)}</span>
        <span class="sug-district">${escapeHtml(item.district || "—")}</span>
      `;

      btn.addEventListener("click", () => {
        // 1. Populate the input and close the dropdown
        input.value = item.institute_name;
        closeDropdown();

        // 2. Geocode the college via Nominatim to get lat/lng
        const query = encodeURIComponent(`${item.institute_name} ${item.district} India`);
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`;

        if (loader) loader.style.display = "block";

        fetch(nominatimUrl)
          .then(r => r.json())
          .then(geo => {
            let lat, lng;
            if (geo && geo.length > 0) {
              lat = parseFloat(geo[0].lat);
              lng = parseFloat(geo[0].lon);
            } else {
              // Fallback: use current map center or default location
              const origin = getRoutingOrigin();
              lat = origin[0];
              lng = origin[1];
              console.warn(`Nominatim: could not geocode "${item.institute_name}". Using fallback coords.`);
            }
            clearRoute();
            generateLocalMesses(lat, lng, item.institute_name);
          })
          .catch(err => {
            console.error("Nominatim geocoding error:", err);
            const origin = getRoutingOrigin();
            clearRoute();
            generateLocalMesses(origin[0], origin[1], item.institute_name);
          })
          .finally(() => {
            if (loader) loader.style.display = "none";
          });
      });

      dropdown.appendChild(btn);
    });

    dropdown.classList.add("open");
  }

  // ── Input listener — debounced fetch to local backend ──────────────────────
  input.addEventListener("input", () => {
    const val = input.value.trim();
    clearTimeout(AppState.searchTimeout);

    // Clear dropdown if query is too short
    if (val.length < 3) {
      closeDropdown();
      if (loader) loader.style.display = "none";
      return;
    }

    if (loader) loader.style.display = "block";

    // Debounce: wait 350ms after the user stops typing
    AppState.searchTimeout = setTimeout(async () => {
      try {
        const url  = `http://localhost:3000/api/institutions/search?q=${encodeURIComponent(input.value)}`;
        const res  = await fetch(url);
        if (!res.ok) throw new Error(`API responded ${res.status}`);
        const data = await res.json();
        renderDropdown(data);
      } catch (err) {
        console.error("College search API error:", err);
        // Show a user-friendly inline error without crashing
        dropdown.innerHTML = "";
        const errRow = document.createElement("div");
        errRow.className = "suggestion-row-empty";
        errRow.textContent = "⚠️  Could not reach search server. Is it running?";
        dropdown.appendChild(errRow);
        dropdown.classList.add("open");
      } finally {
        if (loader) loader.style.display = "none";
      }
    }, 350);
  });

  // ── Close dropdown on outside click ────────────────────────────────────────
  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      closeDropdown();
    }
  });

  // ── Close dropdown on Escape key ───────────────────────────────────────────
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDropdown();
      input.blur();
    }
  });
}

// ─── LIVE GPS TRACKING ────────────────────────────────────────────────────────
function startGPSStream() {
  const pill = dom.gpsStatusPill();
  const text = dom.gpsStatusText();
  
  if (!navigator.geolocation) {
    if (pill) pill.className = "live-pill";
    if (text) text.textContent = "GPS OFF";
    generateLocalMesses(19.1334, 72.9133, "IIT Bombay (Fallback)");
    initLeafletMap();
    return;
  }

  if (pill) pill.className = "live-pill seeking";
  if (text) text.textContent = "SEEKING GPS";

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      AppState.gpsCoords = [pos.coords.latitude, pos.coords.longitude];
      AppState.gpsActive = true;
      if (pill) pill.className = "live-pill active";
      if (text) text.textContent = "GPS LIVE";
      
      if(AppState.liveMesses.length === 0) {
        generateLocalMesses(pos.coords.latitude, pos.coords.longitude, "Your Current Location");
      }
      initLeafletMap();
    },
    (err) => {
      console.warn("GPS Denied. Falling back to default center.", err);
      AppState.gpsCoords = null;
      AppState.gpsActive = false;
      if (pill) pill.className = "live-pill";
      if (text) text.textContent = "GPS OFF";
      
      if(AppState.liveMesses.length === 0) {
        generateLocalMesses(19.1334, 72.9133, "IIT Bombay (Fallback)");
      }
      initLeafletMap();
    },
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
  );
}

function getRoutingOrigin() {
  if (AppState.gpsActive && AppState.gpsCoords) return AppState.gpsCoords;
  if (AppState.liveMesses.length > 0) return [AppState.liveMesses[0].lat, AppState.liveMesses[0].lng]; 
  return [19.1334, 72.9133]; 
}

// ─── LEAFLET & OSRM FREE ROUTING MAP ──────────────────────────────────────────
function initLeafletMap() {
  if (AppState.leafletMap) {
    updateLeafletMarkers();
    return;
  }

  const mapEl = dom.mapCanvas();
  if (!mapEl || typeof L === "undefined") return;

  const origin = getRoutingOrigin();
  
  AppState.leafletMap = L.map("map-canvas", {
    center: origin,
    zoom: 14,
    zoomControl: true,
    attributionControl: true
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  }).addTo(AppState.leafletMap);

  updateLeafletMarkers();
}

function updateLeafletMarkers() {
  if (!AppState.leafletMap) return;

  AppState.leafletMarkers.forEach(item => AppState.leafletMap.removeLayer(item.marker));
  AppState.leafletMarkers = [];

  const map = AppState.leafletMap;
  const origin = getRoutingOrigin();

  const userIcon = L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;background:#2563EB;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(37,99,235,0.5);position:relative;"></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9]
  });
  
  const userMarker = L.marker(origin, { icon: userIcon }).addTo(map)
    .bindPopup(`<div style="font-family:Inter,sans-serif;font-size:13px;"><strong>&#128205; You are here</strong></div>`);
  AppState.leafletMarkers.push({ marker: userMarker, type: "user" });

  AppState.liveMesses.forEach(mess => {
    const accentColor = mess.isVendorMess ? "#FC8019" : (mess.isOpen ? "#22C55E" : "#EF4444");
    const messIcon = L.divIcon({
      className: "",
      html: `<div style="background:#fff;border:2.5px solid ${accentColor};border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;box-shadow:0 3px 12px ${accentColor}55;">${mess.emoji}</div>`,
      iconSize: [40, 40], iconAnchor: [20, 20]
    });
    const marker = L.marker([mess.lat, mess.lng], { icon: messIcon }).addTo(map);
    marker.bindPopup(`<div style="font-family:Inter,sans-serif;font-size:12px;"><strong>${escapeHtml(mess.name)}</strong><br/><button onclick="navigateTo('${mess.id}')" style="margin-top:5px;background:#282C3F;color:#fff;border:none;border-radius:5px;padding:4px 10px;cursor:pointer;">Navigate</button></div>`);
    AppState.leafletMarkers.push({ marker, type: "mess", id: mess.id });
  });
}

function setNavMode(mode) {
  AppState.navMode = mode;
  document.querySelectorAll(".nav-pill").forEach(pill => {
    const isActive = pill.getAttribute("data-mode") === mode;
    pill.classList.toggle("active", isActive);
    pill.setAttribute("aria-pressed", String(isActive));
  });
  if (AppState.activeMessId) navigateTo(AppState.activeMessId);
}

function navigateTo(messId) {
  const mess = AppState.liveMesses.find(m => m.id === messId);
  if (!mess) return;
  if (!AppState.leafletMap) initLeafletMap();

  AppState.activeMessId = messId;
  const mapSection = document.getElementById("map-section");
  if (mapSection) mapSection.scrollIntoView({ behavior: "smooth", block: "start" });

  document.querySelectorAll(".btn-navigate").forEach(btn => btn.classList.remove("active-nav"));
  const activeBtn = document.querySelector(`[data-mess-id="${messId}"] .btn-navigate`);
  if (activeBtn) activeBtn.classList.add("active-nav");

  const osrmProfiles = { foot: "foot", bike: "bike", car: "driving" };
  const serviceUrl = `https://router.project-osrm.org/route/v1/${osrmProfiles[AppState.navMode]}/`;
  const colors = { foot: "#22C55E", bike: "#FC8019", car: "#2563EB" };

  if (AppState.routingControl) {
    if (typeof AppState.routingControl.remove === 'function' && AppState.routingControl._fallbackLine) {
       AppState.routingControl.remove();
    } else {
       AppState.leafletMap.removeControl(AppState.routingControl);
    }
    AppState.routingControl = null;
  }

  const origin = getRoutingOrigin();

  const rc = L.Routing.control({
    waypoints: [L.latLng(origin[0], origin[1]), L.latLng(mess.lat, mess.lng)],
    router: L.Routing.osrmv1({ serviceUrl: serviceUrl, profile: osrmProfiles[AppState.navMode] }),
    lineOptions: { styles: [{ color: colors[AppState.navMode], weight: 5, opacity: 0.85 }, { color: "#fff", weight: 8, opacity: 0.3 }], extendToWaypoints: true, missingRouteTolerance: 0 },
    createMarker: () => null,
    addWaypoints: false, routeWhileDragging: false, show: false, fitSelectedRoutes: true
  }).addTo(AppState.leafletMap);

  rc.on("routesfound", (e) => {
    const r = e.routes[0].summary;
    const info = dom.routeInfoBar(); if (info) info.style.display = "flex";
    const dest = dom.routeDestination(); if (dest) dest.textContent = `Route to ${mess.name}`;
    const dist = dom.routeDistance(); if (dist) dist.textContent = r.totalDistance < 1000 ? Math.round(r.totalDistance) + "m" : (r.totalDistance/1000).toFixed(1) + "km";
    const dur = dom.routeDuration(); if (dur) dur.textContent = Math.round(r.totalTime/60) + " min";
  });

  rc.on("routingerror", () => {
    if (AppState.routingControl) AppState.leafletMap.removeControl(AppState.routingControl);
    const line = L.polyline([origin, [mess.lat, mess.lng]], { color: colors[AppState.navMode], weight: 4, dashArray: "8,8" }).addTo(AppState.leafletMap);
    AppState.leafletMap.fitBounds(line.getBounds(), { padding: [40, 40] });
    AppState.routingControl = { _fallbackLine: line, remove: () => AppState.leafletMap.removeLayer(line) };
    const info = dom.routeInfoBar(); if (info) info.style.display = "flex";
    const dest = dom.routeDestination(); if (dest) dest.textContent = `Route to ${mess.name}`;
    const dist = dom.routeDistance(); if (dist) dist.textContent = "Straight line";
    const dur = dom.routeDuration(); if (dur) dur.textContent = "ETA unknown";
  });

  AppState.routingControl = rc;
}
window.navigateTo = navigateTo;

function clearRoute() {
  if (AppState.routingControl) {
    if (typeof AppState.routingControl.remove === 'function' && AppState.routingControl._fallbackLine) {
       AppState.routingControl.remove();
    } else {
       AppState.leafletMap.removeControl(AppState.routingControl);
    }
    AppState.routingControl = null;
  }
  AppState.activeMessId = null;
  document.querySelectorAll(".btn-navigate").forEach(b => b.classList.remove("active-nav"));
  const info = dom.routeInfoBar(); if (info) info.style.display = "none";
}

// ─── CONSUMER UI RENDERING ────────────────────────────────────────────────────
function renderLeaderboard() {
  const container = document.getElementById("podium-container");
  if (!container || AppState.liveMesses.length < 3) return;
  const sorted = [...AppState.liveMesses].sort((a,b) => b.baselineRating - a.baselineRating);
  const m1 = sorted[0]; const m2 = sorted[1]; const m3 = sorted[2];
  
  container.innerHTML = `
    <div class="podium-card silver">
      <div class="podium-rank silver-rank">2</div><div class="podium-avatar">${m2.emoji}</div>
      <div class="podium-name">${escapeHtml(m2.name)}</div>
      <div class="podium-rating"><span class="podium-star orange-star">&#9733;</span><span class="podium-score">${m2.baselineRating.toFixed(2)}</span><span class="podium-max">/ 5.0</span></div>
      <div class="podium-pillar silver-pillar">2<sup>nd</sup></div>
    </div>
    <div class="podium-card gold">
      <div class="podium-crown">&#128081;</div><div class="podium-rank gold-rank">1</div><div class="podium-avatar">${m1.emoji}</div>
      <div class="podium-name">${escapeHtml(m1.name)}</div>
      <div class="podium-rating"><span class="podium-star gold-star">&#9733;</span><span class="podium-score">${m1.baselineRating.toFixed(2)}</span><span class="podium-max">/ 5.0</span></div>
      <div class="podium-pillar gold-pillar">1<sup>st</sup></div>
    </div>
    <div class="podium-card bronze">
      <div class="podium-rank bronze-rank">3</div><div class="podium-avatar">${m3.emoji}</div>
      <div class="podium-name">${escapeHtml(m3.name)}</div>
      <div class="podium-rating"><span class="podium-star orange-star">&#9733;</span><span class="podium-score">${m3.baselineRating.toFixed(2)}</span><span class="podium-max">/ 5.0</span></div>
      <div class="podium-pillar bronze-pillar">3<sup>rd</sup></div>
    </div>
  `;
}

function renderMessCards() {
  const container = dom.messCardsList();
  if (!container) return;
  
  container.innerHTML = "";
  
  AppState.liveMesses.forEach(mess => {
    const isSoldOut = mess.isOpen && mess.walkInPlates <= 0;
    const isClosed = !mess.isOpen;
    const openLabel = isClosed ? "Closed" : "Open";
    const openClass = isClosed ? "closed" : "open";
    
    let contractBadge = `<span class="contract-status-badge walkin">Walk-in Only</span>`;
    if (AppState.activeStudent && AppState.activeStudent.contractMessId === mess.id) {
      contractBadge = `<span class="contract-status-badge subscribed">&#10003; Subscribed</span>`;
    }

    const card = document.createElement("div");
    card.className = `mess-card${isSoldOut ? " sold-out-card" : ""}`;
    card.id = `card-${mess.id}`;
    card.setAttribute("data-mess-id", mess.id);

    if (isSoldOut) {
      card.style.pointerEvents = "none";
      card.innerHTML = `
        <div class="sold-out-ribbon">&#128683; SOLD OUT</div>
        <div class="mess-card-emoji">${mess.emoji}</div>
        <div class="mess-card-body">
          <div class="mess-card-top">
            <div class="mess-card-name">${escapeHtml(mess.name)} ${contractBadge}</div>
            <div class="open-badge closed"><span class="badge-dot closed"></span>Walk-In Full</div>
          </div>
          <div class="mess-card-meta">
            <div class="mess-meta-pill"><span class="star">&#9733;</span><span class="mess-rating-val">${mess.baselineRating.toFixed(2)}</span></div>
            <div class="mess-meta-pill">&#128205; ${escapeHtml(mess.distanceOffset)}</div>
            <div class="mess-meta-pill"><span class="walkin-pill-count">0</span><span class="walkin-pill-label">&nbsp;plates left</span></div>
          </div>
          <div class="mess-card-actions"><button class="btn-menu" onclick="openMenuModal('${mess.id}')">&#128203; Menu</button></div>
        </div>`;
    } else {
      card.innerHTML = `
        <div class="mess-card-emoji">${mess.emoji}</div>
        <div class="mess-card-body">
          <div class="mess-card-top">
            <div class="mess-card-name">${escapeHtml(mess.name)} ${contractBadge}</div>
            <div class="open-badge ${openClass}"><span class="badge-dot ${openClass}"></span>${openLabel}</div>
          </div>
          <div class="mess-card-meta">
            <div class="mess-meta-pill"><span class="star">&#9733;</span><span class="mess-rating-val">${mess.baselineRating.toFixed(2)}</span></div>
            <div class="mess-meta-pill">&#128205; ${escapeHtml(mess.distanceOffset)}</div>
            <div class="mess-meta-pill"><span class="walkin-pill-count">${mess.walkInPlates}</span><span class="walkin-pill-label">&nbsp;plates left</span></div>
          </div>
          <div class="mess-card-actions">
            <button class="btn-menu" onclick="openMenuModal('${mess.id}')">&#128203; Menu</button>
            <button class="btn-navigate${AppState.activeMessId === mess.id ? ' active-nav' : ''}" onclick="navigateTo('${mess.id}')">&#128694; Navigate</button>
          </div>
        </div>`;
    }
    container.appendChild(card);
  });
}

function openMenuModal(id) {
  const m = AppState.liveMesses.find(x => x.id === id);
  if (!m) return;
  const n = dom.menuMessName(); if (n) n.textContent = m.name;
  const e = dom.menuModalEmoji(); if (e) e.textContent = m.emoji;
  const d = dom.menuDateTag(); if (d) d.textContent = nowDateStr();
  const list = dom.menuChecklist();
  if (list) {
    list.innerHTML = m.menu.map((i, idx) => `
      <li class="menu-item">
        <input type="checkbox" id="mi-${id}-${idx}" style="accent-color:#FC8019;width:15px;height:15px;flex-shrink:0;" />
        <span class="menu-item-emoji">${i.emoji}</span>
        <label class="menu-item-name" for="mi-${id}-${idx}">${escapeHtml(i.name)}</label>
        <span class="menu-item-type type-${i.type}">${i.type === "veg" ? "Veg" : "Non-Veg"}</span>
      </li>
    `).join("");
  }
  const ov = dom.menuModalOverlay(); if (ov) ov.classList.add("active");
}
window.openMenuModal = openMenuModal;

// ─── VENDOR OPERATIONS & CONTRACT IMMUNITY ────────────────────────────────────
function contractPlus() {
  AppState.tokenCounter++;
  const t = `MC-${padNum(AppState.tokenCounter)}-${nowDateStr().replace(/[,\s]/g, "").toUpperCase()}`;
  AppState.activeQRToken = t;
  const idEl = dom.tokenIdDisplay(); if (idEl) idEl.textContent = `TOKEN #${padNum(AppState.tokenCounter)}`;
  const dtEl = dom.tokenDateDisplay(); if (dtEl) dtEl.textContent = `${nowDateStr()} — ${nowTimeStr()}`;
  const ring = dom.qrLoadingRing(); const canvas = dom.qrCanvas();
  if (ring) ring.classList.remove("hidden"); if (canvas) canvas.style.opacity = "0";
  setTimeout(() => {
    if (canvas) { drawQROnCanvas(canvas, t); canvas.style.transition = "opacity 0.3s"; canvas.style.opacity = "1"; }
    if (ring) ring.classList.add("hidden");
  }, 600);
  const ov = dom.qrModalOverlay(); if (ov) ov.classList.add("active");
}

function contractMinus() {
  if (AppState.contractMealsToday <= 0) return;
  AppState.contractMealsToday--;
  const el = dom.contractCount(); if (el) { el.textContent = AppState.contractMealsToday; animateCounter(el); }
}

function simulateScan() {
  const ov = dom.qrModalOverlay(); if (ov) ov.classList.remove("active");
  
  let student = AppState.activeStudent;
  if (!student) student = randomFrom(APP_CONFIG.mockStudents);

  student.hasEatenToday = true;
  if (student.mealsRemaining > 0) student.mealsRemaining--;

  const token = AppState.activeQRToken || `MC-0001`;
  AppState.contractMealsToday++;
  const countEl = dom.contractCount(); if (countEl) { countEl.textContent = AppState.contractMealsToday; animateCounter(countEl); }
  
  const tbody = dom.feedTbody(); const empty = dom.feedEmptyRow();
  if (empty) empty.remove();
  AppState.recentlyEaten.unshift({name: student.name, id: student.studentId, token, time: nowTimeStr()});
  
  const tr = document.createElement("tr"); tr.className = "feed-new-row";
  tr.innerHTML = `<td>${AppState.recentlyEaten.length}</td><td class="feed-student-name">${escapeHtml(student.name)}<br><span style="font-size:0.5rem;font-weight:400;color:rgba(255,255,255,0.4)">${student.studentId} | Bal: ${student.mealsRemaining}</span></td><td class="feed-token">${escapeHtml(token)}</td><td class="feed-time">${escapeHtml(nowTimeStr())}</td>`;
  tbody.insertBefore(tr, tbody.firstChild);
  const b = dom.feedCountBadge(); if (b) b.textContent = AppState.recentlyEaten.length;
}

function drawQROnCanvas(canvas, str) {
  const ctx = canvas.getContext("2d"); const size = canvas.width;
  ctx.clearRect(0, 0, size, size); ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, size, size);
  const cs = 10; const cols = size / cs; let seed = 0;
  for (let i = 0; i < str.length; i++) seed += str.charCodeAt(i) * (i + 1);
  const sRand = (x, y) => { const n = Math.sin(seed + x * 127.1 + y * 311.7) * 43758.54; return n - Math.floor(n); };
  for (let r = 0; r < cols; r++) {
    for (let c = 0; c < cols; c++) {
      if ((c<8&&r<8) || (c>=cols-8&&r<8) || (c<8&&r>=cols-8)) continue;
      if (sRand(c, r) > 0.45) { ctx.fillStyle = "#1C1C2E"; ctx.fillRect(c * cs + 1, r * cs + 1, cs - 2, cs - 2); }
    }
  }
  const dF = (cx, cy) => { ctx.fillStyle = "#1C1C2E"; ctx.fillRect(cx, cy, cs * 7, cs * 7); ctx.fillStyle = "#FFFFFF"; ctx.fillRect(cx + cs, cy + cs, cs * 5, cs * 5); ctx.fillStyle = "#1C1C2E"; ctx.fillRect(cx + cs * 2, cy + cs * 2, cs * 3, cs * 3); };
  dF(0, 0); dF((cols - 7) * cs, 0); dF(0, (cols - 7) * cs);
  ctx.fillStyle = "#FC8019"; ctx.fillRect(0, size - 6, size, 6);
  ctx.fillStyle = "rgba(28,28,46,0.2)"; ctx.font = "bold 9px monospace"; ctx.textAlign = "center"; ctx.fillText(str, size / 2, size - 12);
}

function walkinPlus() { if (AppState.walkInAvailable < AppState.walkInMax) { AppState.walkInAvailable++; AppState.rerouteShown = false; const b = dom.walkinSoldBanner(); if (b) b.style.display = "none"; syncWalkInUI(); } }
function walkinMinus() { if (AppState.walkInAvailable > 0) { AppState.walkInAvailable--; syncWalkInUI(); } }
function syncWalkInUI() {
  const count = AppState.walkInAvailable; const max = AppState.walkInMax;
  const pct = max > 0 ? Math.max(0, Math.round((count / max) * 100)) : 0;
  const cEl = dom.walkinCount(); if (cEl) { cEl.textContent = count; animateCounter(cEl); }
  const bar = dom.walkinProgress(); if (bar) { bar.style.width = pct + "%"; bar.classList.toggle("danger", count <= 5); }
  const stat = dom.walkinStatusText(); if (stat) { if (count <= 0) stat.textContent = "Sold out!"; else if (count <= 5) stat.textContent = `Only ${count} left!`; else stat.textContent = `${count} of ${max} remaining`; }
  const pEl = dom.walkinPctText(); if (pEl) pEl.textContent = pct + "%";

  const vMess = AppState.liveMesses.find(m => m.isVendorMess);
  if (vMess) {
    vMess.walkInPlates = count;
    renderMessCards();
    if (count <= 0 && !AppState.rerouteShown) {
      AppState.rerouteShown = true;
      const soldCard = document.getElementById(`card-${vMess.id}`);
      if (soldCard) {
        soldCard.classList.add("sold-out-card"); soldCard.style.pointerEvents = "none";
        if (!soldCard.querySelector(".sold-out-ribbon")) { const r = document.createElement("div"); r.className="sold-out-ribbon"; r.textContent="🚫 SOLD OUT"; soldCard.appendChild(r); }
      }
      const banner = dom.walkinSoldBanner(); if (banner) banner.style.display = "flex";
      const nextMess = AppState.liveMesses.find(m => !m.isVendorMess && m.isOpen && m.walkInPlates > 0);
      const msg = dom.toastMsg();
      if (msg) msg.textContent = `${vMess.name} walk-in plates are finished! Automatically rerouting your search to ${nextMess ? nextMess.name : "another mess"}...`;
      const t = dom.rerouteToast(); if (t) { t.classList.add("visible"); setTimeout(()=>t.classList.remove("visible"), 8000); }
    }
  }
}

// ─── INIT WIRING ──────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Role Gate
  dom.gateOwnerBtn()?.addEventListener("click", showOwnerPanel);
  dom.gateCustomerBtn()?.addEventListener("click", showCustomerPanel);
  dom.devBypassBtn()?.addEventListener("click", executeDevBypass);
  
  dom.pinSubmitBtn()?.addEventListener("click", submitOwnerPin);
  dom.pinInput()?.addEventListener("keydown", e => { if (e.key === "Enter" || (e.key!=="Backspace" && e.target.value.length >= 3)) setTimeout(submitOwnerPin, 0); });

  dom.studentIdInput()?.addEventListener("keydown", e => { if (e.key === "Enter") submitStudentLogin(); });
  document.getElementById("student-login-btn")?.addEventListener("click", submitStudentLogin);

  // Vendor UI
  document.getElementById("contract-plus-btn")?.addEventListener("click", contractPlus);
  document.getElementById("contract-minus-btn")?.addEventListener("click", contractMinus);
  document.getElementById("walkin-plus-btn")?.addEventListener("click", walkinPlus);
  document.getElementById("walkin-minus-btn")?.addEventListener("click", walkinMinus);
  document.getElementById("simulate-scan-btn")?.addEventListener("click", simulateScan);
  
  const m1 = document.getElementById("qr-modal-close"); if(m1) m1.addEventListener("click", () => dom.qrModalOverlay().classList.remove("active"));
  const m2 = document.getElementById("menu-modal-close"); if(m2) m2.addEventListener("click", () => dom.menuModalOverlay().classList.remove("active"));

  document.getElementById("vendor-logout-btn")?.addEventListener("click", logout);
  document.getElementById("switch-role-btn-desktop")?.addEventListener("click", logout);

  // Nav Pills
  dom.navModePills()?.addEventListener("click", e => { const pill = e.target.closest(".nav-pill"); if(pill) setNavMode(pill.getAttribute("data-mode")); });
  document.getElementById("route-clear-btn")?.addEventListener("click", clearRoute);
  document.getElementById("toast-close-btn")?.addEventListener("click", () => dom.rerouteToast().classList.remove("visible"));

  initAPISearch();
  showView("gate");
});
