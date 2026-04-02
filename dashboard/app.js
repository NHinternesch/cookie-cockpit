// Cookie Cockpit — Dashboard Application

(() => {
  // ===== State =====
  const state = {
    cookies: new Map(),
    sourceUrl: "",
    sourceHost: "",
    sourceTitle: "",
    sourceTabId: null,
    filter: "all",
    search: "",
    sort: "party",
    vendorFilter: "all",
    feedItems: [],
    openModalCookieKey: null,
    localStorageItems: {},
  };

  // ===== DOM =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    monitoredUrl: $("#monitoredUrl"),
    totalCount: $("#totalCount"),
    totalSize: $("#totalSize"),
    secureCount: $("#secureCount"),
    httpOnlyCount: $("#httpOnlyCount"),
    firstPartyCount: $("#firstPartyCount"),
    thirdPartyCount: $("#thirdPartyCount"),
    partyCard: $("#partyCard"),
    persistentCount: $("#persistentCount"),
    sessionCount: $("#sessionCount"),
    typeCard: $("#typeCard"),
    searchInput: $("#searchInput"),
    searchClear: $("#searchClear"),
    sortSelect: $("#sortSelect"),
    vendorSelect: $("#vendorSelect"),
    cookieGrid: $("#cookieGrid"),
    feedList: $("#feedList"),
    cookieList: $("#cookieList"),
    siteScreenshot: $("#siteScreenshot"),
    screenshotPlaceholder: $("#screenshotPlaceholder"),
    placeholderHost: $("#placeholderHost"),
    modalOverlay: $("#modalOverlay"),
    modalContent: $("#modalContent"),
    modalClose: $("#modalClose"),
    deleteAllBtn: $("#deleteAllBtn"),
    deleteFilteredBtn: $("#deleteFilteredBtn"),
    createCookieBtn: $("#createCookieBtn"),
    exportCsvBtn: $("#exportCsvBtn"),
    particles: $("#particles"),
    localStorageCard: $("#localStorageCard"),
    localStorageMatchCount: $("#localStorageMatchCount"),
  };

  // ===== Dark Mode =====
  function initDarkMode() {
    const toggle = $("#darkModeToggle");
    const saved = localStorage.getItem("cookieCockpitTheme");
    if (saved === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      toggle.setAttribute("aria-checked", "true");
    }
    toggle.addEventListener("click", () => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      if (isDark) {
        document.documentElement.removeAttribute("data-theme");
        toggle.setAttribute("aria-checked", "false");
        localStorage.setItem("cookieCockpitTheme", "light");
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
        toggle.setAttribute("aria-checked", "true");
        localStorage.setItem("cookieCockpitTheme", "dark");
      }
    });
  }

  // ===== Init =====
  function init() {
    parseParams();
    initDarkMode();
    setupParticles();
    setupConnection();
    setupEventListeners();
  }

  function parseParams() {
    const params = new URLSearchParams(location.search);
    state.sourceUrl = params.get("url") || "";
    state.sourceTabId = parseInt(params.get("tabId"), 10) || null;
    state.sourceTitle = params.get("title") || "";

    try {
      const urlObj = new URL(state.sourceUrl);
      state.sourceHost = urlObj.hostname;
      dom.monitoredUrl.textContent = urlObj.hostname + urlObj.pathname;
      dom.placeholderHost.textContent = urlObj.hostname;
      document.title = `Cookie Cockpit — ${urlObj.hostname}`;
    } catch {
      state.sourceHost = "";
      dom.monitoredUrl.textContent = state.sourceUrl || "Unknown";
    }
  }

  // ===== Messaging =====
  const pendingOps = new Set();

  function sendMessage(msg, matchFn, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      const port = state.port;
      let settled = false;
      const op = {};

      const settle = () => {
        if (settled) return false;
        settled = true;
        clearTimeout(tid);
        port.onMessage.removeListener(onResult);
        pendingOps.delete(op);
        return true;
      };

      const onResult = (response) => {
        if (settled || !matchFn(response)) return;
        settle();
        resolve(response);
      };

      const tid = setTimeout(() => {
        if (settle()) reject(new Error("Timeout"));
      }, timeoutMs);

      op.abort = () => {
        if (settle()) reject(new Error("Disconnected"));
      };

      pendingOps.add(op);
      port.onMessage.addListener(onResult);

      try {
        port.postMessage(msg);
      } catch (err) {
        settle();
        reject(err);
      }
    });
  }

  function abortPendingOps() {
    for (const op of pendingOps) op.abort();
  }

  // ===== Background Connection =====
  function connectPort() {
    const port = chrome.runtime.connect({ name: "cookie-cockpit-dashboard" });

    port.onMessage.addListener((msg) => {
      switch (msg.type) {
        case "cookies":
          if (msg.screenshot) {
            dom.siteScreenshot.src = msg.screenshot;
            dom.screenshotPlaceholder.classList.add("hidden");
          }
          if (msg.localStorageItems) {
            state.localStorageItems = msg.localStorageItems;
          }
          handleInitialCookies(msg.cookies);
          break;
        case "cookie-changed":
          handleCookieChange(msg);
          break;
      }
    });

    port.onDisconnect.addListener(() => {
      abortPendingOps();
      // Service worker went idle — reconnect so future operations work
      state.port = connectPort();
      // Re-register with the background so cookie-changed events keep flowing
      state.port.postMessage({
        type: "get-cookies",
        url: state.sourceUrl,
        tabId: state.sourceTabId,
      });
    });

    return port;
  }

  function setupConnection() {
    state.port = connectPort();

    state.port.postMessage({
      type: "get-cookies",
      url: state.sourceUrl,
      tabId: state.sourceTabId,
    });
  }

  // ===== Cookie Data =====
  function cookieKey(c) {
    return `${c.domain}|${c.path}|${c.name}`;
  }

  function isFirstParty(cookie) {
    if (cookie.firstParty !== undefined) return cookie.firstParty;
    if (!state.sourceHost) return false;
    const d = cookie.domain.startsWith(".")
      ? cookie.domain.slice(1)
      : cookie.domain;
    return state.sourceHost === d || state.sourceHost.endsWith("." + d);
  }

  // Check if a cookie value also exists in localStorage (min 8 chars to avoid false positives)
  function findLocalStorageMatches(cookie) {
    const matches = [];
    if (!cookie.value || cookie.value.length < 8) return matches;
    for (const [key, val] of Object.entries(state.localStorageItems)) {
      if (val && val.includes(cookie.value)) {
        matches.push(key);
      }
    }
    return matches;
  }

  function handleInitialCookies(cookies) {
    state.cookies.clear();
    for (const c of cookies) {
      c.vendor = identifyVendor(c.name, c.domain);
      state.cookies.set(cookieKey(c), c);
    }
    renderAll();
  }

  function handleCookieChange(msg) {
    const key = cookieKey(msg.cookie);
    msg.cookie.firstParty = isFirstParty(msg.cookie);
    msg.cookie.vendor = identifyVendor(msg.cookie.name, msg.cookie.domain);

    let action;
    if (msg.removed) {
      if (msg.cause === "overwrite") return; // skip, the add follows
      action = "removed";
      state.cookies.delete(key);
    } else {
      action = state.cookies.has(key) ? "changed" : "added";
      state.cookies.set(key, msg.cookie);
    }

    addFeedItem(action, msg.cookie, msg.cause);
    renderAll();
    highlightCard(key, action);
    flashFloatingCookie(key);
  }

  // ===== Rendering =====
  function renderAll() {
    updateVendorDropdown();
    renderStats();
    renderFloatingCookies();
    renderCookies();
    refreshOpenModal();
  }

  function updateVendorDropdown() {
    const cookies = Array.from(state.cookies.values());
    const vendors = new Set();
    let hasUnidentified = false;

    for (const c of cookies) {
      const v = c.vendor;
      if (v) vendors.add(v);
      else hasUnidentified = true;
    }

    const sorted = Array.from(vendors).sort((a, b) => a.localeCompare(b));
    const prev = dom.vendorSelect.value;

    dom.vendorSelect.innerHTML = '<option value="all">All Vendors</option>';
    for (const v of sorted) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      dom.vendorSelect.appendChild(opt);
    }
    if (hasUnidentified) {
      const opt = document.createElement("option");
      opt.value = "unidentified";
      opt.textContent = "Unidentified";
      dom.vendorSelect.appendChild(opt);
    }

    // Preserve selection if still valid
    if (prev && dom.vendorSelect.querySelector(`option[value="${CSS.escape(prev)}"]`)) {
      dom.vendorSelect.value = prev;
    } else {
      dom.vendorSelect.value = "all";
      state.vendorFilter = "all";
    }
  }

  function renderStats() {
    const cookies = Array.from(state.cookies.values());
    const total = cookies.length;
    const totalSize = cookies.reduce((s, c) => s + c.size, 0);
    const fp = cookies.filter((c) => isFirstParty(c)).length;
    const tp = total - fp;
    const sess = cookies.filter((c) => c.session).length;
    const pers = total - sess;

    animateStat(dom.totalCount, total);
    dom.totalSize.textContent = formatBytes(totalSize);
    animateStat(dom.secureCount, cookies.filter((c) => c.secure).length);
    animateStat(dom.httpOnlyCount, cookies.filter((c) => c.httpOnly).length);

    // Party split KPI box
    animateStat(dom.firstPartyCount, fp);
    animateStat(dom.thirdPartyCount, tp);
    const fpPct = total > 0 ? (fp / total) * 100 : 0;
    dom.partyCard.style.background = `linear-gradient(to right, rgba(13,148,136,0.10) ${fpPct}%, rgba(37,99,235,0.10) ${fpPct}%)`;

    // Type split KPI box
    animateStat(dom.persistentCount, pers);
    animateStat(dom.sessionCount, sess);
    const persPct = total > 0 ? (pers / total) * 100 : 0;
    dom.typeCard.style.background = `linear-gradient(to right, rgba(124,58,237,0.10) ${persPct}%, rgba(184,134,11,0.10) ${persPct}%)`;

    // Local Storage matches
    const lsMatchCount = cookies.filter((c) => findLocalStorageMatches(c).length > 0).length;
    if (lsMatchCount > 0) {
      dom.localStorageCard.style.display = "";
      animateStat(dom.localStorageMatchCount, lsMatchCount);
    } else {
      dom.localStorageCard.style.display = "none";
    }
  }

  function animateStat(el, val) {
    const formatted = String(val);
    if (el.textContent !== formatted) {
      el.textContent = formatted;
      el.classList.remove("bump");
      void el.offsetWidth;
      el.classList.add("bump");
    }
  }

  // ===== Cookie List (next to iMac) =====
  let initialListRendered = false;

  function renderFloatingCookies() {
    const container = dom.cookieList;
    const cookies = getFilteredCookies();

    // Build a set of current keys for diffing
    const newKeys = new Set(cookies.map((c) => cookieKey(c)));
    const existingEls = new Map();
    for (const el of container.querySelectorAll(".cookie-list-item")) {
      existingEls.set(el.dataset.key, el);
    }

    // Remove old
    for (const [key, el] of existingEls) {
      if (!newKeys.has(key)) {
        el.style.opacity = "0";
        setTimeout(() => el.remove(), 300);
      }
    }

    // Remove empty placeholder
    const empty = container.querySelector(".cookie-list-empty");
    if (empty && cookies.length > 0) empty.remove();

    const isInitial = !initialListRendered && cookies.length > 0;
    let newCount = 0;

    cookies.forEach((cookie) => {
      const key = cookieKey(cookie);

      if (existingEls.has(key)) {
        // Update existing item content and click handler
        const el = existingEls.get(key);
        const first = isFirstParty(cookie);
        el.classList.remove("first-party", "third-party");
        el.classList.add(first ? "first-party" : "third-party");
        el.innerHTML = `
          <span class="cookie-list-dot"></span>
          <span class="cookie-list-name">${esc(cookie.name)}</span>
          ${cookie.vendor ? `<span class="cookie-list-vendor">${esc(cookie.vendor)}</span>` : ""}
          <span class="cookie-list-domain">${esc(cookie.domain)}</span>
        `;
        el.onclick = () => openModal(cookie);
        return;
      }

      const el = document.createElement("div");
      const first = isFirstParty(cookie);
      el.className = `cookie-list-item ${first ? "first-party" : "third-party"}`;
      el.dataset.key = key;
      el.innerHTML = `
        <span class="cookie-list-dot"></span>
        <span class="cookie-list-name">${esc(cookie.name)}</span>
        ${cookie.vendor ? `<span class="cookie-list-vendor">${esc(cookie.vendor)}</span>` : ""}
        <span class="cookie-list-domain">${esc(cookie.domain)}</span>
      `;
      el.style.cursor = "pointer";
      el.addEventListener("click", () => openModal(cookie));

      container.appendChild(el);

      // Staggered slide-in from iMac direction
      const delay = isInitial ? newCount * 60 : 0;
      setTimeout(() => el.classList.add("visible"), delay + 10);
      newCount++;
    });

    // Reorder existing items to match the sorted order
    for (const cookie of cookies) {
      const key = cookieKey(cookie);
      const el = container.querySelector(`[data-key="${CSS.escape(key)}"]`);
      if (el) container.appendChild(el);
    }

    if (isInitial) {
      initialListRendered = true;
    }
  }

  function flashFloatingCookie(key) {
    const el = dom.cookieList.querySelector(
      `[data-key="${CSS.escape(key)}"]`
    );
    if (!el) return;
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");
  }

  // ===== Cookie Cards =====
  function renderCookies() {
    const filtered = getFilteredCookies();

    // Toggle Delete Filtered button active state
    const isFiltering =
      state.filter !== "all" ||
      state.search !== "" ||
      state.vendorFilter !== "all";
    dom.deleteFilteredBtn.classList.toggle("active", isFiltering);

    if (filtered.length === 0) {
      dom.cookieGrid.innerHTML = "";
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML =
        state.search || state.filter !== "all" || state.vendorFilter !== "all"
          ? '<span class="empty-icon">🔍</span><p>No cookies match your filters</p>'
          : '<span class="empty-icon">🍪</span><p>No cookies found for this page</p>';
      dom.cookieGrid.appendChild(empty);
      return;
    }

    const existingCards = new Map();
    for (const card of dom.cookieGrid.querySelectorAll(".cookie-card")) {
      existingCards.set(card.dataset.key, card);
    }

    const newKeys = new Set(filtered.map((c) => cookieKey(c)));

    for (const [key, card] of existingCards) {
      if (!newKeys.has(key)) {
        card.style.animation = "cardRemove 0.3s ease forwards";
        card.addEventListener("animationend", () => card.remove(), {
          once: true,
        });
      }
    }

    const fragment = document.createDocumentFragment();
    const orderedKeys = [];

    for (let i = 0; i < filtered.length; i++) {
      const c = filtered[i];
      const key = cookieKey(c);
      orderedKeys.push(key);

      if (existingCards.has(key)) {
        updateCardContent(existingCards.get(key), c);
      } else {
        fragment.appendChild(createCookieCard(c, i));
      }
    }

    const emptyState = dom.cookieGrid.querySelector(".empty-state");
    if (emptyState) emptyState.remove();

    dom.cookieGrid.appendChild(fragment);

    for (const key of orderedKeys) {
      const card = dom.cookieGrid.querySelector(
        `[data-key="${CSS.escape(key)}"]`
      );
      if (card) dom.cookieGrid.appendChild(card);
    }
  }

  function createCookieCard(cookie, index) {
    const card = document.createElement("div");
    const key = cookieKey(cookie);
    const partyClass = isFirstParty(cookie) ? "first-party" : "third-party";
    const typeClass = cookie.session ? "session" : "persistent";

    card.className = `cookie-card ${partyClass} ${typeClass}`;
    card.dataset.key = key;
    card.style.animationDelay = `${Math.min(index * 30, 300)}ms`;
    card.addEventListener("click", () => openModal(cookie));

    updateCardContent(card, cookie);
    return card;
  }

  function updateCardContent(card, cookie) {
    const partyClass = isFirstParty(cookie) ? "first-party" : "third-party";
    const typeClass = cookie.session ? "session" : "persistent";

    card.classList.remove("first-party", "third-party", "session", "persistent");
    card.classList.add(partyClass, typeClass);

    const lsMatches = findLocalStorageMatches(cookie);

    card.innerHTML = `
      <div class="cookie-card-header">
        <span class="cookie-name">${esc(cookie.name)}</span>
        <span class="cookie-size">${formatBytes(cookie.size)}</span>
      </div>
      <div class="cookie-domain">${esc(cookie.domain)}</div>
      <div class="cookie-value-preview">${esc(truncate(cookie.value, 60)) || '<em style="opacity:0.4">empty</em>'}</div>
      <div class="cookie-badges">
        ${cookie.vendor ? `<span class="badge vendor-badge">${esc(cookie.vendor)}</span>` : ""}
        ${lsMatches.length > 0 ? `<span class="badge badge-localstorage">Found in Local Storage</span>` : ""}
      </div>
      ${!cookie.session && cookie.expirationDate ? `<div class="cookie-expiry">Expires in ${formatDate(cookie.expirationDate)}</div>` : ""}
    `;

    card.onclick = () => openModal(cookie);
  }

  function highlightCard(key, action) {
    const card = dom.cookieGrid.querySelector(
      `[data-key="${CSS.escape(key)}"]`
    );
    if (!card) return;
    if (action === "changed" || action === "added") {
      card.classList.remove("changed");
      void card.offsetWidth;
      card.classList.add("changed");
    }
  }

  // ===== Filtering & Sorting =====
  function getFilteredCookies() {
    let cookies = Array.from(state.cookies.values()).filter(cookieMatchesFilters);

    cookies.sort((a, b) => {
      switch (state.sort) {
        case "party": {
          const af = isFirstParty(a) ? 0 : 1;
          const bf = isFirstParty(b) ? 0 : 1;
          if (af !== bf) return af - bf;
          return a.domain.localeCompare(b.domain) || a.name.localeCompare(b.name);
        }
        case "name":
          return a.name.localeCompare(b.name);
        case "domain":
          return a.domain.localeCompare(b.domain) || a.name.localeCompare(b.name);
        case "size":
          return b.size - a.size;
        case "expiry":
          return (a.expirationDate || Infinity) - (b.expirationDate || Infinity);
        default:
          return 0;
      }
    });

    return cookies;
  }

  // ===== Live Feed =====
  function cookieMatchesFilters(c) {
    switch (state.filter) {
      case "firstParty":
        if (!isFirstParty(c)) return false;
        break;
      case "thirdParty":
        if (isFirstParty(c)) return false;
        break;
      case "secure":
        if (!c.secure) return false;
        break;
      case "httpOnly":
        if (!c.httpOnly) return false;
        break;
      case "session":
        if (!c.session) return false;
        break;
      case "persistent":
        if (c.session) return false;
        break;
      case "large":
        if (c.size <= 100) return false;
        break;
      case "localStorage":
        if (findLocalStorageMatches(c).length === 0) return false;
        break;
    }
    if (state.search) {
      const q = state.search.toLowerCase();
      if (
        !c.name.toLowerCase().includes(q) &&
        !c.domain.toLowerCase().includes(q) &&
        !(c.value && c.value.toLowerCase().includes(q)) &&
        !(c.vendor && c.vendor.toLowerCase().includes(q))
      )
        return false;
    }
    if (state.vendorFilter !== "all") {
      if (state.vendorFilter === "unidentified") {
        if (c.vendor) return false;
      } else if (c.vendor !== state.vendorFilter) return false;
    }
    return true;
  }

  function addFeedItem(action, cookie, cause) {
    const item = { action, cookie, cause, time: Date.now() };
    state.feedItems.unshift(item);
    if (state.feedItems.length > 100) state.feedItems.pop();
    renderFeedItem(item, true);
  }

  function renderFeedItem(item, prepend) {
    const empty = dom.feedList.querySelector(".feed-empty");
    if (empty) empty.remove();

    const el = document.createElement("div");
    el.className = `feed-item ${item.action}`;
    if (!cookieMatchesFilters(item.cookie)) el.classList.add("feed-hidden");

    const labels = { added: "Added", removed: "Removed", changed: "Changed", overwrite: "Updated" };

    el.innerHTML = `
      <div class="feed-item-header">
        <span class="feed-item-action">${labels[item.action] || item.action}</span>
        <span class="feed-item-time">${formatTime(item.time)}</span>
      </div>
      <div class="feed-item-name">${esc(item.cookie.name)}</div>
      <div class="feed-item-domain">${esc(item.cookie.domain)}</div>
    `;

    if (prepend) dom.feedList.prepend(el);
    else dom.feedList.appendChild(el);
    while (dom.feedList.children.length > 80) dom.feedList.lastChild.remove();
  }

  function renderFeed() {
    dom.feedList.innerHTML = "";
    for (const item of state.feedItems) {
      renderFeedItem(item, false);
    }
    if (dom.feedList.children.length === 0) {
      const empty = document.createElement("div");
      empty.className = "feed-empty";
      empty.textContent = "Waiting for cookie changes...";
      dom.feedList.appendChild(empty);
    }
  }

  // ===== Modal (editable properties) =====
  function openModal(cookie) {
    state.openModalCookieKey = cookieKey(cookie);
    const first = isFirstParty(cookie);
    const partyText = first ? "1st Party Cookie" : "3rd Party Cookie";
    const partyClass = first ? "first-party" : "third-party";
    const vendor = cookie.vendor;

    // Build expiration datetime-local value
    let expiresValue = "";
    if (!cookie.session && cookie.expirationDate) {
      const d = new Date(cookie.expirationDate * 1000);
      expiresValue = toDatetimeLocal(d);
    }

    const lsMatches = findLocalStorageMatches(cookie);

    dom.modalContent.innerHTML = `
      <h2>${esc(cookie.name)}</h2>
      <div class="modal-domain">${esc(cookie.domain)}${esc(cookie.path)}</div>
      <div class="modal-party-badge ${partyClass}">${partyText}</div><div class="modal-type-badge ${cookie.session ? "session" : "persistent"}">${cookie.session ? "Session" : "Persistent"}</div>${vendor ? `<div class="modal-vendor-badge">${esc(vendor)}</div>` : ""}

      <div class="modal-section">
        <div class="modal-section-title">Value</div>
        <textarea class="modal-value modal-value-edit" id="modalValueEdit">${esc(cookie.value)}</textarea>
        <div class="modal-value-actions">
          <button class="copy-btn" id="copyValueBtn">Copy value</button>
          <button class="copy-btn" id="copyDecodedBtn">Copy decoded value</button>
          <button class="copy-btn save-btn" id="saveValueBtn">Save</button>
          <button class="delete-btn" id="deleteBtn">Delete</button>
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Details</div>
        <div class="modal-detail-grid">
          <div class="modal-detail editable">
            <div>
              <div class="modal-detail-label">Secure</div>
            </div>
            <label class="modal-toggle">
              <input type="checkbox" id="modalSecure" ${cookie.secure ? "checked" : ""} />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="modal-detail editable">
            <div>
              <div class="modal-detail-label">HttpOnly</div>
            </div>
            <label class="modal-toggle">
              <input type="checkbox" id="modalHttpOnly" ${cookie.httpOnly ? "checked" : ""} />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="modal-detail editable editable-full">
            <div class="modal-detail-label">SameSite</div>
            <div class="modal-detail-value">
              <select class="modal-select" id="modalSameSite">
                <option value="unspecified" ${cookie.sameSite === "unspecified" ? "selected" : ""}>Unspecified</option>
                <option value="no_restriction" ${cookie.sameSite === "no_restriction" ? "selected" : ""}>None</option>
                <option value="lax" ${cookie.sameSite === "lax" ? "selected" : ""}>Lax</option>
                <option value="strict" ${cookie.sameSite === "strict" ? "selected" : ""}>Strict</option>
              </select>
            </div>
          </div>
          <div class="modal-detail">
            <div class="modal-detail-label">Size</div>
            <div class="modal-detail-value">${formatBytes(cookie.size)}</div>
          </div>
          <div class="modal-detail editable editable-full" style="grid-column: 1 / -1;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div class="modal-detail-label">Expires</div>
              <button class="session-btn ${cookie.session ? "active" : ""}" id="modalSessionBtn">${cookie.session ? "Session (active)" : "Make Session"}</button>
            </div>
            <div class="modal-detail-value">
              <input type="datetime-local" class="modal-datetime" id="modalExpires" value="${expiresValue}" ${cookie.session ? "disabled" : ""} />
            </div>
          </div>
        </div>
      </div>
      ${lsMatches.length > 0 ? `
      <div class="modal-localstorage">
        <div class="modal-localstorage-title">Found in Local Storage</div>
        ${lsMatches.map((key, i) => `
          <div class="modal-localstorage-item">
            <div class="modal-localstorage-label">Key</div>
            <div class="modal-localstorage-key">${esc(key)}</div>
            <div class="modal-localstorage-label">Value</div>
            <div class="modal-localstorage-val">${esc(truncate(state.localStorageItems[key] || "", 200))}</div>
            <div class="modal-localstorage-actions">
              <button class="ls-delete-btn" data-ls-index="${i}">Delete from Local Storage</button>
            </div>
          </div>
        `).join("")}
      </div>
      ` : ""}
    `;

    dom.modalOverlay.classList.add("open");

    const textarea = dom.modalContent.querySelector("#modalValueEdit");
    const copyBtn = dom.modalContent.querySelector("#copyValueBtn");
    const copyDecodedBtn = dom.modalContent.querySelector("#copyDecodedBtn");
    const saveBtn = dom.modalContent.querySelector("#saveValueBtn");
    const deleteBtn = dom.modalContent.querySelector("#deleteBtn");
    const secureCheck = dom.modalContent.querySelector("#modalSecure");
    const httpOnlyCheck = dom.modalContent.querySelector("#modalHttpOnly");
    const sameSiteSelect = dom.modalContent.querySelector("#modalSameSite");
    const expiresInput = dom.modalContent.querySelector("#modalExpires");
    const sessionBtn = dom.modalContent.querySelector("#modalSessionBtn");

    // Local Storage delete buttons
    for (const btn of dom.modalContent.querySelectorAll(".ls-delete-btn")) {
      btn.addEventListener("click", async () => {
        const lsKey = lsMatches[parseInt(btn.dataset.lsIndex, 10)];
        btn.textContent = "Deleting...";
        btn.disabled = true;
        try {
          const result = await sendMessage(
            { type: "delete-localstorage", tabId: state.sourceTabId, key: lsKey },
            (r) => r.type === "delete-localstorage-result" && r.key === lsKey
          );
          if (result.success) {
            delete state.localStorageItems[lsKey];
            btn.textContent = "Deleted!";
            setTimeout(() => { renderAll(); openModal(state.cookies.get(cookieKey(cookie))); }, 800);
          } else {
            btn.textContent = "Failed";
            setTimeout(() => { btn.textContent = "Delete from Local Storage"; btn.disabled = false; }, 1500);
          }
        } catch {
          btn.textContent = "Failed";
          setTimeout(() => { btn.textContent = "Delete from Local Storage"; btn.disabled = false; }, 1500);
        }
      });
    }

    let isSession = cookie.session;

    sessionBtn.addEventListener("click", () => {
      isSession = !isSession;
      expiresInput.disabled = isSession;
      sessionBtn.textContent = isSession ? "Session (active)" : "Make Session";
      sessionBtn.classList.toggle("active", isSession);
      if (!isSession && !expiresInput.value) {
        // Default to 1 year from now
        const d = new Date(Date.now() + 365 * 86400000);
        expiresInput.value = toDatetimeLocal(d);
      }
    });

    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(textarea.value).then(() => {
        copyBtn.textContent = "Copied!";
        copyBtn.classList.add("copied");
        setTimeout(() => {
          copyBtn.textContent = "Copy value";
          copyBtn.classList.remove("copied");
        }, 1500);
      });
    });

    copyDecodedBtn.addEventListener("click", () => {
      let decoded;
      try {
        decoded = decodeURIComponent(textarea.value);
      } catch {
        decoded = textarea.value;
      }
      navigator.clipboard.writeText(decoded).then(() => {
        copyDecodedBtn.textContent = "Copied!";
        copyDecodedBtn.classList.add("copied");
        setTimeout(() => {
          copyDecodedBtn.textContent = "Copy decoded value";
          copyDecodedBtn.classList.remove("copied");
        }, 1500);
      });
    });

    // Delete single cookie
    deleteBtn.addEventListener("click", async () => {
      deleteBtn.textContent = "Deleting...";
      deleteBtn.disabled = true;
      try {
        const result = await sendMessage(
          { type: "remove-cookie", cookie },
          (r) => r.type === "remove-cookie-result"
        );
        if (result.success) {
          deleteBtn.textContent = "Deleted!";
          setTimeout(() => closeModal(), 600);
        } else {
          deleteBtn.textContent = "Failed";
          setTimeout(() => { deleteBtn.textContent = "Delete"; deleteBtn.disabled = false; }, 1500);
        }
      } catch {
        deleteBtn.textContent = "Failed";
        setTimeout(() => { deleteBtn.textContent = "Delete"; deleteBtn.disabled = false; }, 1500);
      }
    });

    // Save with all editable properties
    saveBtn.addEventListener("click", async () => {
      saveBtn.textContent = "Saving...";
      saveBtn.disabled = true;

      const updatedCookie = {
        name: cookie.name,
        domain: cookie.domain,
        path: cookie.path,
        storeId: cookie.storeId,
        secure: secureCheck.checked,
        httpOnly: httpOnlyCheck.checked,
        sameSite: sameSiteSelect.value,
        session: isSession,
        expirationDate: cookie.expirationDate,
      };

      if (!isSession && expiresInput.value) {
        updatedCookie.expirationDate = Math.floor(new Date(expiresInput.value).getTime() / 1000);
      } else if (isSession) {
        updatedCookie.session = true;
        delete updatedCookie.expirationDate;
      }

      try {
        const result = await sendMessage(
          { type: "set-cookie", cookie: updatedCookie, value: textarea.value },
          (r) => r.type === "set-cookie-result"
        );
        if (result.success) {
          saveBtn.textContent = "Saved!";
          saveBtn.classList.add("copied");
          setTimeout(() => {
            saveBtn.textContent = "Save";
            saveBtn.classList.remove("copied");
            saveBtn.disabled = false;
          }, 1500);
        } else {
          saveBtn.textContent = "Failed";
          setTimeout(() => { saveBtn.textContent = "Save"; saveBtn.disabled = false; }, 1500);
        }
      } catch {
        saveBtn.textContent = "Failed";
        setTimeout(() => { saveBtn.textContent = "Save"; saveBtn.disabled = false; }, 1500);
      }
    });
  }

  function toDatetimeLocal(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function closeModal() {
    state.openModalCookieKey = null;
    dom.modalOverlay.classList.remove("open");
  }

  function refreshOpenModal() {
    if (!state.openModalCookieKey) return;
    if (!dom.modalOverlay.classList.contains("open")) return;
    const cookie = state.cookies.get(state.openModalCookieKey);
    if (!cookie) {
      // Cookie was removed — close the modal
      closeModal();
      return;
    }
    // Only refresh if user is not actively editing (textarea not focused)
    const activeEl = document.activeElement;
    const isEditing = activeEl && (activeEl.tagName === "TEXTAREA" || activeEl.tagName === "INPUT" || activeEl.tagName === "SELECT");
    if (isEditing) return;
    openModal(cookie);
  }

  // ===== Create Cookie Modal =====
  function openCreateModal() {
    const defaultDomain = state.sourceHost || "";
    const defaultExpiry = toDatetimeLocal(new Date(Date.now() + 365 * 86400000));

    dom.modalContent.innerHTML = `
      <h2>Create Cookie</h2>
      <div class="modal-domain">New cookie for ${esc(defaultDomain)}</div>

      <div class="modal-section">
        <div class="modal-section-title">Name</div>
        <input type="text" class="modal-value-edit" id="createName" placeholder="cookie_name" style="min-height:auto;resize:none;" />
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Value</div>
        <textarea class="modal-value modal-value-edit" id="createValue" placeholder="cookie_value"></textarea>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Domain & Path</div>
        <div class="modal-detail-grid">
          <div class="modal-detail editable editable-full">
            <div class="modal-detail-label">Domain</div>
            <input type="text" class="modal-value-edit" id="createDomain" value="${esc(defaultDomain)}" style="min-height:auto;resize:none;" />
          </div>
          <div class="modal-detail editable editable-full">
            <div class="modal-detail-label">Path</div>
            <input type="text" class="modal-value-edit" id="createPath" value="/" style="min-height:auto;resize:none;" />
          </div>
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Details</div>
        <div class="modal-detail-grid">
          <div class="modal-detail editable">
            <div><div class="modal-detail-label">Secure</div></div>
            <label class="modal-toggle">
              <input type="checkbox" id="createSecure" checked />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="modal-detail editable">
            <div><div class="modal-detail-label">HttpOnly</div></div>
            <label class="modal-toggle">
              <input type="checkbox" id="createHttpOnly" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="modal-detail editable editable-full">
            <div class="modal-detail-label">SameSite</div>
            <div class="modal-detail-value">
              <select class="modal-select" id="createSameSite">
                <option value="lax" selected>Lax</option>
                <option value="strict">Strict</option>
                <option value="no_restriction">None</option>
                <option value="unspecified">Unspecified</option>
              </select>
            </div>
          </div>
          <div class="modal-detail editable editable-full" style="grid-column: 1 / -1;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div class="modal-detail-label">Expires</div>
              <button class="session-btn" id="createSessionBtn">Make Session</button>
            </div>
            <div class="modal-detail-value">
              <input type="datetime-local" class="modal-datetime" id="createExpires" value="${defaultExpiry}" />
            </div>
          </div>
        </div>
      </div>

      <div class="modal-value-actions">
        <button class="copy-btn save-btn" id="createSaveBtn">Create</button>
      </div>
    `;

    dom.modalOverlay.classList.add("open");

    const nameInput = dom.modalContent.querySelector("#createName");
    const valueInput = dom.modalContent.querySelector("#createValue");
    const domainInput = dom.modalContent.querySelector("#createDomain");
    const pathInput = dom.modalContent.querySelector("#createPath");
    const secureCheck = dom.modalContent.querySelector("#createSecure");
    const httpOnlyCheck = dom.modalContent.querySelector("#createHttpOnly");
    const sameSiteSelect = dom.modalContent.querySelector("#createSameSite");
    const expiresInput = dom.modalContent.querySelector("#createExpires");
    const sessionBtn = dom.modalContent.querySelector("#createSessionBtn");
    const saveBtn = dom.modalContent.querySelector("#createSaveBtn");

    let isSession = false;

    sessionBtn.addEventListener("click", () => {
      isSession = !isSession;
      expiresInput.disabled = isSession;
      sessionBtn.textContent = isSession ? "Session (active)" : "Make Session";
      sessionBtn.classList.toggle("active", isSession);
    });

    nameInput.focus();

    saveBtn.addEventListener("click", async () => {
      const name = nameInput.value.trim();
      const domain = domainInput.value.trim();
      if (!name) { nameInput.focus(); return; }
      if (!domain) { domainInput.focus(); return; }

      saveBtn.textContent = "Creating...";
      saveBtn.disabled = true;

      const newCookie = {
        name,
        domain,
        path: pathInput.value.trim() || "/",
        secure: secureCheck.checked,
        httpOnly: httpOnlyCheck.checked,
        sameSite: sameSiteSelect.value,
        session: isSession,
      };

      if (!isSession && expiresInput.value) {
        newCookie.expirationDate = Math.floor(new Date(expiresInput.value).getTime() / 1000);
      }

      try {
        const result = await sendMessage(
          { type: "set-cookie", cookie: newCookie, value: valueInput.value },
          (r) => r.type === "set-cookie-result"
        );
        if (result.success) {
          saveBtn.textContent = "Created!";
          saveBtn.classList.add("copied");
          setTimeout(() => closeModal(), 800);
        } else {
          saveBtn.textContent = "Failed";
          setTimeout(() => { saveBtn.textContent = "Create"; saveBtn.disabled = false; }, 1500);
        }
      } catch {
        saveBtn.textContent = "Failed";
        setTimeout(() => { saveBtn.textContent = "Create"; saveBtn.disabled = false; }, 1500);
      }
    });
  }

  // ===== Event Listeners =====
  function setupEventListeners() {
    let searchTimeout;
    dom.searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      dom.searchClear.classList.toggle("visible", e.target.value.length > 0);
      searchTimeout = setTimeout(() => {
        state.search = e.target.value.trim();
        renderFloatingCookies();
        renderCookies();
        renderFeed();
      }, 200);
    });

    dom.searchClear.addEventListener("click", () => {
      dom.searchInput.value = "";
      dom.searchClear.classList.remove("visible");
      state.search = "";
      renderFloatingCookies();
      renderCookies();
      renderFeed();
      dom.searchInput.focus();
    });

    for (const chip of $$(".chip")) {
      chip.addEventListener("click", () => {
        $$(".chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        state.filter = chip.dataset.filter;
        dom.localStorageCard.classList.remove("active");
        renderFloatingCookies();
        renderCookies();
        renderFeed();
      });
    }

    // Click localStorage KPI to toggle filter
    dom.localStorageCard.addEventListener("click", () => {
      const isActive = state.filter === "localStorage";
      state.filter = isActive ? "all" : "localStorage";
      dom.localStorageCard.classList.toggle("active", !isActive);
      $$(".chip").forEach((c) => c.classList.toggle("active", isActive && c.dataset.filter === "all"));
      renderFloatingCookies();
      renderCookies();
      renderFeed();
    });

    dom.sortSelect.addEventListener("change", (e) => {
      state.sort = e.target.value;
      renderFloatingCookies();
      renderCookies();
    });

    dom.vendorSelect.addEventListener("change", (e) => {
      state.vendorFilter = e.target.value;
      renderFloatingCookies();
      renderCookies();
      renderFeed();
    });

    dom.modalClose.addEventListener("click", closeModal);
    dom.modalOverlay.addEventListener("click", (e) => {
      if (e.target === dom.modalOverlay) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    // Create Cookie
    dom.createCookieBtn.addEventListener("click", () => openCreateModal());

    // Delete Filtered Cookies
    dom.deleteFilteredBtn.addEventListener("click", async () => {
      const isFiltering =
        state.filter !== "all" ||
        state.search !== "" ||
        state.vendorFilter !== "all";
      if (!isFiltering) return;

      const cookies = getFilteredCookies();
      if (cookies.length === 0) return;
      if (!confirm(`Delete ${cookies.length} filtered cookies?`)) return;

      dom.deleteFilteredBtn.textContent = "Deleting...";
      dom.deleteFilteredBtn.disabled = true;

      try {
        const result = await sendMessage(
          { type: "remove-all-cookies", cookies },
          (r) => r.type === "remove-all-cookies-result",
          15000
        );
        if (result.success) {
          dom.deleteFilteredBtn.textContent = `Deleted ${result.removed} cookies!`;
        } else {
          dom.deleteFilteredBtn.textContent = `Deleted ${result.removed}, ${result.failed} failed`;
        }
        setTimeout(() => {
          dom.deleteFilteredBtn.textContent = "Delete Filtered";
          dom.deleteFilteredBtn.disabled = false;
        }, 2000);
      } catch {
        dom.deleteFilteredBtn.textContent = "Failed";
        setTimeout(() => {
          dom.deleteFilteredBtn.textContent = "Delete Filtered";
          dom.deleteFilteredBtn.disabled = false;
        }, 1500);
      }
    });

    // Delete All
    dom.deleteAllBtn.addEventListener("click", async () => {
      const cookies = Array.from(state.cookies.values());
      if (cookies.length === 0) return;
      if (!confirm(`Delete all ${cookies.length} cookies?`)) return;

      dom.deleteAllBtn.textContent = "Deleting...";
      dom.deleteAllBtn.disabled = true;

      try {
        const result = await sendMessage(
          { type: "remove-all-cookies", cookies },
          (r) => r.type === "remove-all-cookies-result",
          15000
        );
        if (result.success) {
          dom.deleteAllBtn.textContent = `Deleted ${result.removed} cookies!`;
        } else {
          dom.deleteAllBtn.textContent = `Deleted ${result.removed}, ${result.failed} failed`;
        }
        setTimeout(() => {
          dom.deleteAllBtn.textContent = "Delete All";
          dom.deleteAllBtn.disabled = false;
        }, 2000);
      } catch {
        dom.deleteAllBtn.textContent = "Failed";
        setTimeout(() => {
          dom.deleteAllBtn.textContent = "Delete All";
          dom.deleteAllBtn.disabled = false;
        }, 1500);
      }
    });

    // Export All Cookies as CSV
    dom.exportCsvBtn.addEventListener("click", () => {
      const cookies = Array.from(state.cookies.values());
      if (cookies.length === 0) return;

      dom.exportCsvBtn.disabled = true;

      const columns = ["name", "value", "domain", "path", "size", "secure", "httpOnly", "sameSite", "session", "expirationDate", "vendor"];

      function csvEscape(val) {
        const str = val == null ? "" : String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      }

      const rows = [columns.join(",")];
      for (const c of cookies) {
        const row = [
          c.name, c.value, c.domain, c.path, c.size,
          c.secure, c.httpOnly, c.sameSite, c.session,
          c.expirationDate || "", c.vendor || "",
        ].map(csvEscape);
        rows.push(row.join(","));
      }

      const csv = rows.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cookies-${state.sourceHost || "export"}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      dom.exportCsvBtn.textContent = "Exported!";
      setTimeout(() => {
        dom.exportCsvBtn.textContent = "Export All";
        dom.exportCsvBtn.disabled = false;
      }, 1500);
    });
  }

  // ===== Particles =====
  function setupParticles() {
    const colors = [
      "rgba(58, 61, 74, 0.12)",
      "rgba(90, 96, 120, 0.10)",
      "rgba(46, 48, 64, 0.10)",
      "rgba(100, 105, 125, 0.08)",
    ];
    for (let i = 0; i < 20; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      const size = Math.random() * 6 + 3;
      p.style.width = size + "px";
      p.style.height = size + "px";
      p.style.left = Math.random() * 100 + "%";
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.animationDuration = Math.random() * 15 + 15 + "s";
      p.style.animationDelay = Math.random() * 20 + "s";
      dom.particles.appendChild(p);
    }
  }

  // ===== Utilities =====
  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    return (bytes / 1024).toFixed(1) + " KB";
  }

  function formatDate(timestamp) {
    const d = new Date(timestamp * 1000);
    const diff = d - new Date();
    if (diff < 0) return "Expired";
    const days = Math.floor(diff / 86400000);
    if (days > 365) {
      const y = Math.floor(days / 365);
      return `${y} year${y > 1 ? "s" : ""}`;
    }
    if (days > 30) return `${Math.floor(days / 30)} months`;
    if (days > 0) return `${days} day${days > 1 ? "s" : ""}`;
    const hours = Math.floor(diff / 3600000);
    if (hours > 0) return `${hours}h`;
    return `${Math.floor(diff / 60000)}m`;
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function truncate(str, len) {
    if (!str) return "";
    return str.length > len ? str.slice(0, len) + "\u2026" : str;
  }

  function esc(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  init();
})();
