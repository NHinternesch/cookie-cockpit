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
    feedItems: [],
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
    sortSelect: $("#sortSelect"),
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
    createCookieBtn: $("#createCookieBtn"),
    particles: $("#particles"),
  };

  // ===== Init =====
  function init() {
    parseParams();
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

  // ===== Background Connection =====
  function setupConnection() {
    state.port = chrome.runtime.connect({ name: "cookie-cockpit-dashboard" });

    state.port.onMessage.addListener((msg) => {
      switch (msg.type) {
        case "cookies":
          if (msg.screenshot) {
            dom.siteScreenshot.src = msg.screenshot;
            dom.screenshotPlaceholder.classList.add("hidden");
          }
          handleInitialCookies(msg.cookies);
          break;
        case "cookie-changed":
          handleCookieChange(msg);
          break;
      }
    });

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

  function handleInitialCookies(cookies) {
    state.cookies.clear();
    for (const c of cookies) state.cookies.set(cookieKey(c), c);
    renderAll();
  }

  function handleCookieChange(msg) {
    const key = cookieKey(msg.cookie);
    msg.cookie.firstParty = isFirstParty(msg.cookie);

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
    renderStats();
    renderFloatingCookies();
    renderCookies();
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
      if (existingEls.has(key)) return;

      const el = document.createElement("div");
      const first = isFirstParty(cookie);
      const vendor = identifyVendor(cookie.name);
      el.className = `cookie-list-item ${first ? "first-party" : "third-party"}`;
      el.dataset.key = key;
      el.innerHTML = `
        <span class="cookie-list-dot"></span>
        <span class="cookie-list-name">${esc(cookie.name)}</span>
        ${vendor ? `<span class="cookie-list-vendor">${esc(vendor)}</span>` : ""}
        <span class="cookie-list-domain">${esc(cookie.domain)}</span>
      `;
      el.style.cursor = "pointer";
      el.addEventListener("click", () => openModal(cookie));

      container.appendChild(el);

      // Staggered fade-in from top to bottom
      const delay = isInitial ? newCount * 60 : 0;
      setTimeout(() => el.classList.add("visible"), delay + 10);
      newCount++;
    });

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

    if (filtered.length === 0) {
      dom.cookieGrid.innerHTML = "";
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML =
        state.search || state.filter !== "all"
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

    card.className = card.className
      .replace(/first-party|third-party/, partyClass)
      .replace(/\b(session|persistent)\b/, typeClass);
    if (!card.className.includes("-party")) card.classList.add(partyClass);
    if (!/\b(session|persistent)\b/.test(card.className)) card.classList.add(typeClass);

    const vendor = identifyVendor(cookie.name);

    card.innerHTML = `
      <div class="cookie-card-header">
        <span class="cookie-name">${esc(cookie.name)}</span>
        <span class="cookie-size">${formatBytes(cookie.size)}</span>
      </div>
      <div class="cookie-domain">${esc(cookie.domain)}</div>
      <div class="cookie-value-preview">${esc(truncate(cookie.value, 60)) || '<em style="opacity:0.4">empty</em>'}</div>
      <div class="cookie-badges">
        ${vendor ? `<span class="badge vendor-badge">${esc(vendor)}</span>` : ""}
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
    let cookies = Array.from(state.cookies.values());

    switch (state.filter) {
      case "firstParty":
        cookies = cookies.filter((c) => isFirstParty(c));
        break;
      case "thirdParty":
        cookies = cookies.filter((c) => !isFirstParty(c));
        break;
      case "secure":
        cookies = cookies.filter((c) => c.secure);
        break;
      case "httpOnly":
        cookies = cookies.filter((c) => c.httpOnly);
        break;
      case "session":
        cookies = cookies.filter((c) => c.session);
        break;
      case "persistent":
        cookies = cookies.filter((c) => !c.session);
        break;
      case "large":
        cookies = cookies.filter((c) => c.size > 100);
        break;
    }

    if (state.search) {
      const q = state.search.toLowerCase();
      cookies = cookies.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.domain.toLowerCase().includes(q) ||
          c.value.toLowerCase().includes(q)
      );
    }

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
  function addFeedItem(action, cookie, cause) {
    const item = { action, cookie, cause, time: Date.now() };
    state.feedItems.unshift(item);
    if (state.feedItems.length > 100) state.feedItems.pop();
    renderFeedItem(item);
  }

  function renderFeedItem(item) {
    const empty = dom.feedList.querySelector(".feed-empty");
    if (empty) empty.remove();

    const el = document.createElement("div");
    el.className = `feed-item ${item.action}`;

    const labels = { added: "Added", removed: "Removed", changed: "Changed", overwrite: "Updated" };

    el.innerHTML = `
      <div class="feed-item-header">
        <span class="feed-item-action">${labels[item.action] || item.action}</span>
        <span class="feed-item-time">${formatTime(item.time)}</span>
      </div>
      <div class="feed-item-name">${esc(item.cookie.name)}</div>
      <div class="feed-item-domain">${esc(item.cookie.domain)}</div>
    `;

    dom.feedList.prepend(el);
    while (dom.feedList.children.length > 80) dom.feedList.lastChild.remove();
  }

  // ===== Modal (editable properties) =====
  function openModal(cookie) {
    const first = isFirstParty(cookie);
    const partyText = first ? "1st Party Cookie" : "3rd Party Cookie";
    const partyClass = first ? "first-party" : "third-party";
    const vendor = identifyVendor(cookie.name);

    // Build expiration datetime-local value
    let expiresValue = "";
    if (!cookie.session && cookie.expirationDate) {
      const d = new Date(cookie.expirationDate * 1000);
      expiresValue = toDatetimeLocal(d);
    }

    dom.modalContent.innerHTML = `
      <h2>${esc(cookie.name)}</h2>
      <div class="modal-domain">${esc(cookie.domain)}${esc(cookie.path)}</div>
      <div class="modal-party-badge ${partyClass}">${partyText}</div><div class="modal-type-badge ${cookie.session ? "session" : "persistent"}">${cookie.session ? "Session" : "Persistent"}</div>${vendor ? `<div class="modal-vendor-badge">${esc(vendor)}</div>` : ""}

      <div class="modal-section">
        <div class="modal-section-title">Value</div>
        <textarea class="modal-value modal-value-edit" id="modalValueEdit">${esc(cookie.value)}</textarea>
        <div class="modal-value-actions">
          <button class="copy-btn" id="copyValueBtn">Copy value</button>
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
    `;

    dom.modalOverlay.classList.add("open");

    const textarea = dom.modalContent.querySelector("#modalValueEdit");
    const copyBtn = dom.modalContent.querySelector("#copyValueBtn");
    const saveBtn = dom.modalContent.querySelector("#saveValueBtn");
    const deleteBtn = dom.modalContent.querySelector("#deleteBtn");
    const secureCheck = dom.modalContent.querySelector("#modalSecure");
    const httpOnlyCheck = dom.modalContent.querySelector("#modalHttpOnly");
    const sameSiteSelect = dom.modalContent.querySelector("#modalSameSite");
    const expiresInput = dom.modalContent.querySelector("#modalExpires");
    const sessionBtn = dom.modalContent.querySelector("#modalSessionBtn");

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

    // Delete single cookie
    deleteBtn.addEventListener("click", () => {
      deleteBtn.textContent = "Deleting...";
      deleteBtn.disabled = true;

      let settled = false;
      const cleanup = () => {
        settled = true;
        clearTimeout(tid);
        state.port.onMessage.removeListener(onResult);
      };

      const onResult = (msg) => {
        if (msg.type !== "remove-cookie-result" || settled) return;
        cleanup();
        if (msg.success) {
          deleteBtn.textContent = "Deleted!";
          setTimeout(() => closeModal(), 600);
        } else {
          deleteBtn.textContent = "Failed";
          setTimeout(() => {
            deleteBtn.textContent = "Delete";
            deleteBtn.disabled = false;
          }, 1500);
        }
      };

      const tid = setTimeout(() => {
        if (settled) return;
        cleanup();
        deleteBtn.textContent = "Failed";
        setTimeout(() => {
          deleteBtn.textContent = "Delete";
          deleteBtn.disabled = false;
        }, 1500);
      }, 5000);

      state.port.onMessage.addListener(onResult);
      try {
        state.port.postMessage({ type: "remove-cookie", cookie });
      } catch {
        cleanup();
        deleteBtn.textContent = "Failed";
        setTimeout(() => {
          deleteBtn.textContent = "Delete";
          deleteBtn.disabled = false;
        }, 1500);
      }
    });

    // Save with all editable properties
    saveBtn.addEventListener("click", () => {
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

      let settled = false;
      const cleanup = () => {
        settled = true;
        clearTimeout(timeoutId);
        state.port.onMessage.removeListener(onResult);
      };

      const onResult = (msg) => {
        if (msg.type !== "set-cookie-result" || settled) return;
        cleanup();
        if (msg.success) {
          saveBtn.textContent = "Saved!";
          saveBtn.classList.add("copied");
          setTimeout(() => {
            saveBtn.textContent = "Save";
            saveBtn.classList.remove("copied");
            saveBtn.disabled = false;
          }, 1500);
        } else {
          saveBtn.textContent = "Failed";
          setTimeout(() => {
            saveBtn.textContent = "Save";
            saveBtn.disabled = false;
          }, 1500);
        }
      };

      const timeoutId = setTimeout(() => {
        if (settled) return;
        cleanup();
        saveBtn.textContent = "Failed";
        setTimeout(() => {
          saveBtn.textContent = "Save";
          saveBtn.disabled = false;
        }, 1500);
      }, 5000);

      state.port.onMessage.addListener(onResult);
      try {
        state.port.postMessage({
          type: "set-cookie",
          cookie: updatedCookie,
          value: textarea.value,
        });
      } catch {
        cleanup();
        saveBtn.textContent = "Failed";
        setTimeout(() => {
          saveBtn.textContent = "Save";
          saveBtn.disabled = false;
        }, 1500);
      }
    });
  }

  function toDatetimeLocal(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function closeModal() {
    dom.modalOverlay.classList.remove("open");
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

    saveBtn.addEventListener("click", () => {
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

      let settled = false;
      const cleanup = () => {
        settled = true;
        clearTimeout(timeoutId);
        state.port.onMessage.removeListener(onResult);
      };

      const onResult = (msg) => {
        if (msg.type !== "set-cookie-result" || settled) return;
        cleanup();
        if (msg.success) {
          saveBtn.textContent = "Created!";
          saveBtn.classList.add("copied");
          setTimeout(() => closeModal(), 800);
        } else {
          saveBtn.textContent = "Failed";
          setTimeout(() => {
            saveBtn.textContent = "Create";
            saveBtn.disabled = false;
          }, 1500);
        }
      };

      const timeoutId = setTimeout(() => {
        if (settled) return;
        cleanup();
        saveBtn.textContent = "Failed";
        setTimeout(() => {
          saveBtn.textContent = "Create";
          saveBtn.disabled = false;
        }, 1500);
      }, 5000);

      state.port.onMessage.addListener(onResult);
      try {
        state.port.postMessage({
          type: "set-cookie",
          cookie: newCookie,
          value: valueInput.value,
        });
      } catch {
        cleanup();
        saveBtn.textContent = "Failed";
        setTimeout(() => {
          saveBtn.textContent = "Create";
          saveBtn.disabled = false;
        }, 1500);
      }
    });
  }

  // ===== Event Listeners =====
  function setupEventListeners() {
    let searchTimeout;
    dom.searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.search = e.target.value.trim();
        renderFloatingCookies();
        renderCookies();
      }, 200);
    });

    for (const chip of $$(".chip")) {
      chip.addEventListener("click", () => {
        $$(".chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        state.filter = chip.dataset.filter;
        renderFloatingCookies();
        renderCookies();
      });
    }

    dom.sortSelect.addEventListener("change", (e) => {
      state.sort = e.target.value;
      renderFloatingCookies();
      renderCookies();
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

    // Delete All Cookies
    dom.deleteAllBtn.addEventListener("click", () => {
      const cookies = Array.from(state.cookies.values());
      if (cookies.length === 0) return;
      if (!confirm(`Delete all ${cookies.length} cookies?`)) return;

      dom.deleteAllBtn.textContent = "Deleting...";
      dom.deleteAllBtn.disabled = true;

      let settled = false;
      const cleanup = () => {
        settled = true;
        clearTimeout(tid);
        state.port.onMessage.removeListener(onResult);
      };

      const onResult = (msg) => {
        if (msg.type !== "remove-all-cookies-result" || settled) return;
        cleanup();
        if (msg.success) {
          dom.deleteAllBtn.textContent = `Deleted ${msg.removed} cookies!`;
        } else {
          dom.deleteAllBtn.textContent = `Deleted ${msg.removed}, ${msg.failed} failed`;
        }
        setTimeout(() => {
          dom.deleteAllBtn.textContent = "Delete All Cookies";
          dom.deleteAllBtn.disabled = false;
        }, 2000);
      };

      const tid = setTimeout(() => {
        if (settled) return;
        cleanup();
        dom.deleteAllBtn.textContent = "Delete All Cookies";
        dom.deleteAllBtn.disabled = false;
      }, 15000);

      state.port.onMessage.addListener(onResult);
      try {
        state.port.postMessage({ type: "remove-all-cookies", cookies });
      } catch {
        cleanup();
        dom.deleteAllBtn.textContent = "Failed";
        setTimeout(() => {
          dom.deleteAllBtn.textContent = "Delete All Cookies";
          dom.deleteAllBtn.disabled = false;
        }, 1500);
      }
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

  // ===== Vendor Identification =====
  const vendorExact = {
    _ga: "Google Analytics", _gid: "Google Analytics",
    _fbp: "Meta", _fbc: "Meta", fr: "Meta",
    IDE: "DoubleClick", DSID: "DoubleClick", test_cookie: "DoubleClick",
    __gads: "Google Ad Manager", __gpi: "Google Ad Manager",
    NID: "Google", SID: "Google", HSID: "Google", SSID: "Google",
    APISID: "Google", SAPISID: "Google", "1P_JAR": "Google",
    YSC: "YouTube", VISITOR_INFO1_LIVE: "YouTube", GPS: "YouTube",
    bcookie: "LinkedIn", lidc: "LinkedIn",
    UserMatchHistory: "LinkedIn", AnalyticsSyncHistory: "LinkedIn",
    _ttp: "TikTok",
    _twclid: "Twitter/X", muc_ads: "Twitter/X",
    _rdt_uuid: "Reddit",
    _scid: "Snapchat", sc_at: "Snapchat",
    MUID: "Microsoft Ads",
    obuid: "Outbrain",
    hubspotutk: "HubSpot", __hstc: "HubSpot", __hssc: "HubSpot", __hssrc: "HubSpot",
    OptanonConsent: "OneTrust", OptanonAlertBoxClosed: "OneTrust",
    CookieConsent: "Cookiebot",
    euconsent: "Didomi",
    PHPSESSID: "PHP", JSESSIONID: "Java", "ASP.NET_SessionId": "ASP.NET",
    s_cc: "Adobe Analytics", s_sq: "Adobe Analytics",
    s_vi: "Adobe Analytics", s_fid: "Adobe Analytics",
    _derived_epik: "Pinterest", _epik: "Pinterest",
    "receive-cookie-deprecation": "Privacy Sandbox",
    atuserid: "Piano Analytics",
  };

  const vendorPrefixes = [
    ["_ga_", "Google Analytics"], ["_gat", "Google Analytics"], ["__utm", "Google Analytics"],
    ["_gcl_", "Google Ads"], ["_gac_", "Google Ads"],
    ["_tt_", "TikTok"],
    ["_pin_", "Pinterest"],
    ["li_", "LinkedIn"],
    ["_uet", "Microsoft Ads"], ["_uetvid", "Microsoft Ads"],
    ["__hs", "HubSpot"],
    ["_hjid", "Hotjar"], ["_hj", "Hotjar"],
    ["_clck", "Clarity"], ["_clsk", "Clarity"],
    ["mp_", "Mixpanel"],
    ["ajs_", "Segment"],
    ["amp_", "Amplitude"],
    ["_hp2_", "Heap"],
    ["_cs_", "ContentSquare"],
    ["_pk_", "Matomo"],
    ["_dd_", "Datadog"],
    ["_at.", "Piano Analytics"], ["at_", "Piano Analytics"],
    ["pa_", "Piano Analytics"], ["_pcid", "Piano Analytics"],
    ["_pctx", "Piano Analytics"], ["_pprv", "Piano Analytics"],
    ["AMCV_", "Adobe Analytics"], ["AMCVS_", "Adobe Analytics"],
    ["s_", "Adobe Analytics"],
    ["__cf", "Cloudflare"], ["cf_", "Cloudflare"],
    ["__stripe", "Stripe"],
    ["__adroll", "AdRoll"],
    ["cto_", "Criteo"],
    ["t_gid", "Taboola"], ["taboola_", "Taboola"],
    ["drift", "Drift"],
    ["intercom-", "Intercom"],
    ["_mkto_", "Marketo"],
    ["sfdc-", "Salesforce"],
    ["_zd", "Zendesk"],
    ["didomi", "Didomi"],
    ["cmapi_", "TrustArc"],
    ["uc_", "Usercentrics"],
    ["wp-", "WordPress"], ["wordpress_", "WordPress"],
    ["_shopify", "Shopify"],
  ];

  function identifyVendor(cookieName) {
    const exact = vendorExact[cookieName];
    if (exact) return exact;
    const lower = cookieName.toLowerCase();
    for (const [prefix, vendor] of vendorPrefixes) {
      if (lower.startsWith(prefix)) return vendor;
    }
    return null;
  }

  // ===== Utilities =====
  function securityScore(cookie) {
    let score = 0;
    if (cookie.secure) score++;
    if (cookie.httpOnly) score++;
    if (cookie.sameSite === "strict") score += 2;
    else if (cookie.sameSite === "lax") score++;
    return score;
  }

  function securityClass(cookie) {
    const s = securityScore(cookie);
    if (s >= 3) return "security-high";
    if (s >= 2) return "security-medium";
    if (s >= 1) return "security-low";
    return "security-none";
  }

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
