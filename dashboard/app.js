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
    openModalCookieKey: null,
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
    refreshOpenModal();
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

      if (existingEls.has(key)) {
        // Update existing item content and click handler
        const el = existingEls.get(key);
        const first = isFirstParty(cookie);
        const vendor = identifyVendor(cookie.name, cookie.domain);
        el.className = el.className.replace(/first-party|third-party/, first ? "first-party" : "third-party");
        el.innerHTML = `
          <span class="cookie-list-dot"></span>
          <span class="cookie-list-name">${esc(cookie.name)}</span>
          ${vendor ? `<span class="cookie-list-vendor">${esc(vendor)}</span>` : ""}
          <span class="cookie-list-domain">${esc(cookie.domain)}</span>
        `;
        el.onclick = () => openModal(cookie);
        return;
      }

      const el = document.createElement("div");
      const first = isFirstParty(cookie);
      const vendor = identifyVendor(cookie.name, cookie.domain);
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

    const vendor = identifyVendor(cookie.name, cookie.domain);

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
      cookies = cookies.filter((c) => {
        const vendor = identifyVendor(c.name, c.domain);
        return (
          c.name.toLowerCase().includes(q) ||
          c.domain.toLowerCase().includes(q) ||
          c.value.toLowerCase().includes(q) ||
          (vendor && vendor.toLowerCase().includes(q))
        );
      });
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
    state.openModalCookieKey = cookieKey(cookie);
    const first = isFirstParty(cookie);
    const partyText = first ? "1st Party Cookie" : "3rd Party Cookie";
    const partyClass = first ? "first-party" : "third-party";
    const vendor = identifyVendor(cookie.name, cookie.domain);

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
    // Google & YouTube
    _ga: "Google Analytics", _gid: "Google Analytics",
    _fbp: "Meta", _fbc: "Meta", fr: "Meta",
    IDE: "DoubleClick", DSID: "DoubleClick", test_cookie: "DoubleClick",
    __gads: "Google Ad Manager", __gpi: "Google Ad Manager",
    NID: "Google", SID: "Google", HSID: "Google", SSID: "Google",
    APISID: "Google", SAPISID: "Google", "1P_JAR": "Google",
    YSC: "YouTube", VISITOR_INFO1_LIVE: "YouTube", GPS: "YouTube",
    // Social & Ads
    bcookie: "LinkedIn", lidc: "LinkedIn",
    UserMatchHistory: "LinkedIn", AnalyticsSyncHistory: "LinkedIn",
    _ttp: "TikTok",
    _twclid: "Twitter/X", muc_ads: "Twitter/X",
    _rdt_uuid: "Reddit",
    _scid: "Snapchat", sc_at: "Snapchat",
    MUID: "Microsoft Ads",
    obuid: "Outbrain",
    // Marketing Automation
    hubspotutk: "HubSpot", __hstc: "HubSpot", __hssc: "HubSpot", __hssrc: "HubSpot",
    // Consent Management
    OptanonConsent: "OneTrust", OptanonAlertBoxClosed: "OneTrust",
    CookieConsent: "Cookiebot",
    euconsent: "Didomi",
    "euconsent-v2": "Didomi",
    _iub_cs: "iubenda",
    cmplz_consent_status: "Complianz", cmplz_marketing: "Complianz",
    axeptio_authorized_vendors: "Axeptio", axeptio_cookies: "Axeptio",
    sp_consent: "Sourcepoint",
    _evidon_consent_ls: "Crownpeak",
    // Server / Language
    PHPSESSID: "PHP", JSESSIONID: "Java", "ASP.NET_SessionId": "ASP.NET",
    // Adobe Analytics
    s_cc: "Adobe Analytics", s_sq: "Adobe Analytics",
    s_vi: "Adobe Analytics", s_fid: "Adobe Analytics",
    s_ecid: "Adobe Analytics", s_ppv: "Adobe Analytics",
    // Adobe Target
    at_check: "Adobe Target", at_lojson: "Adobe Target",
    // Segment
    ajs_user_id: "Segment", ajs_anonymous_id: "Segment",
    // Pinterest
    _derived_epik: "Pinterest", _epik: "Pinterest",
    // Privacy Sandbox
    "receive-cookie-deprecation": "Privacy Sandbox",
    // Piano
    atuserid: "Piano Analytics",
    __pianoParams: "Piano Composer", __tbc: "Piano Composer",
    xbc: "Piano Composer", __utp: "Piano ID",
    // Paywall & Subscription
    _tp: "Tinypass",
    metered_paywall_views: "Leaky Paywall",
    lura_auth: "Lura",
    // CDPs
    _schn: "Permutive",
    rl_user_id: "RudderStack", rl_anonymous_id: "RudderStack",
    _mfuuid_: "mParticle",
    _td: "Treasure Data",
    _sio: "Lytics",
    // DMPs
    _cc_id: "Lotame", _cc_aud: "Lotame", _cc_dc: "Lotame",
    bk_uuid: "Oracle BlueKai",
    kxlotame: "Lotame",
    rlas3: "LiveRamp", rl_ec: "LiveRamp",
    _li_ss: "Leadinfo",
    // A/B Testing & Personalization
    _vwo_uuid: "VWO",
    ABTasty: "AB Tasty", ABTastySession: "AB Tasty",
    ely_vID: "Kameleoon",
    _dyjsession: "Dynamic Yield", _dy_c_exps: "Dynamic Yield",
    _dy_geo: "Dynamic Yield", _dy_ses_load_seq: "Dynamic Yield",
    mt_misc: "Monetate", mt_mop: "Monetate",
    // Customer Engagement
    _braze_api: "Braze",
    __kla_id: "Klaviyo",
    _mailchimp: "Mailchimp",
    // Ad Tech
    ttd_id: "The Trade Desk",
    __qca: "Quantcast",
    _lr_env: "LiveRamp",
    _li_dcdm_c: "Linkedin Insights",
    // Affiliate & Attribution
    _ppcookie: "Post Affiliate Pro",
    // Tag Management
    _gtm_id: "Google Tag Manager",
    // Chat & Support
    __lc_cid: "LiveChat", __lc_cst: "LiveChat",
    _fw_crm_v: "Freshworks",
    // Session Replay & Analytics
    ab_test: "Google Optimize",
    // E-commerce
    _woocommerce_session: "WooCommerce",
    _shopify_y: "Shopify", _shopify_s: "Shopify",
    cart_id: "BigCommerce",
    // CDN & Performance
    __cfduid: "Cloudflare",
    _fastly: "Fastly",
    incap_ses: "Imperva", visid_incap: "Imperva",
    ak_bmsc: "Akamai", bm_sv: "Akamai", bm_sz: "Akamai",
    // Bot Detection
    _px3: "PerimeterX", _pxhd: "PerimeterX", _pxvid: "PerimeterX",
    __cf_bm: "Cloudflare Bot Management",
    datadome: "DataDome",
    reese84: "Shape Security",
  };

  const vendorPrefixes = [
    // Google & Ads
    ["_ga_", "Google Analytics"], ["_gat", "Google Analytics"], ["__utm", "Google Analytics"],
    ["_gcl_", "Google Ads"], ["_gac_", "Google Ads"],
    // Social
    ["_tt_", "TikTok"],
    ["_pin_", "Pinterest"],
    ["li_", "LinkedIn"],
    ["_uet", "Microsoft Ads"], ["_uetvid", "Microsoft Ads"],
    // Marketing Automation
    ["__hs", "HubSpot"],
    // Session Replay & Analytics
    ["_hjid", "Hotjar"], ["_hj", "Hotjar"],
    ["_clck", "Clarity"], ["_clsk", "Clarity"],
    ["mp_", "Mixpanel"],
    ["amp_", "Amplitude"],
    ["_hp2_", "Heap"],
    ["_cs_", "ContentSquare"],
    ["_pk_", "Matomo"],
    ["_dd_", "Datadog"],
    ["_lr_", "LogRocket"],
    ["_fs_", "FullStory"],
    ["_sn_", "FullStory"],
    // Piano
    ["_at.", "Piano Analytics"], ["at_", "Piano Analytics"],
    ["pa_", "Piano Analytics"], ["_pcid", "Piano Analytics"],
    ["_pctx", "Piano Analytics"], ["_pprv", "Piano Analytics"],
    ["__piano", "Piano Composer"], ["tp_", "Piano Composer"],
    // Adobe
    ["AMCV_", "Adobe Analytics"], ["AMCVS_", "Adobe Analytics"],
    ["mbox", "Adobe Target"],
    // CDN & Infrastructure
    ["__cf", "Cloudflare"], ["cf_", "Cloudflare"],
    ["__stripe", "Stripe"],
    // Ad Tech
    ["__adroll", "AdRoll"],
    ["cto_", "Criteo"],
    ["t_gid", "Taboola"], ["taboola_", "Taboola"],
    ["_ljtrtb_", "Livejournal"],
    ["ttd_", "The Trade Desk"],
    // Chat & Engagement
    ["drift", "Drift"],
    ["intercom-", "Intercom"],
    // Marketing
    ["_mkto_", "Marketo"],
    ["sfdc-", "Salesforce"],
    ["pardot", "Pardot"],
    ["_zd", "Zendesk"],
    // Consent Management
    ["didomi", "Didomi"],
    ["cmapi_", "TrustArc"],
    ["uc_", "Usercentrics"],
    ["iub_", "iubenda"],
    ["cmplz_", "Complianz"],
    ["axeptio_", "Axeptio"],
    ["sp_", "Sourcepoint"],
    ["qc_", "Quantcast Choice"], ["_qc_", "Quantcast"],
    // CDPs
    ["ajs_", "Segment"],
    ["rl_", "RudderStack"],
    ["teal_", "Tealium"], ["utag_", "Tealium"],
    ["_mparticle_", "mParticle"], ["mprtcl-", "mParticle"],
    ["_td_", "Treasure Data"],
    ["seerid", "Lytics"], ["_sio_", "Lytics"],
    ["_bc_", "BlueConic"], ["bc_", "BlueConic"],
    // DMPs
    ["_cc_", "Lotame"],
    ["bk_", "Oracle BlueKai"],
    ["kx_", "Krux/Salesforce DMP"],
    ["permutive-", "Permutive"], ["_prmtv_", "Permutive"],
    ["_lr_", "LiveRamp"], ["rlas", "LiveRamp"],
    // A/B Testing & Personalization
    ["_vis_opt_", "VWO"], ["_vwo_", "VWO"],
    ["optimizelyenduser", "Optimizely"], ["optimizely", "Optimizely"],
    ["abtasty", "AB Tasty"],
    ["kameleoon", "Kameleoon"], ["ely_", "Kameleoon"],
    ["_dy_", "Dynamic Yield"],
    ["mt_", "Monetate"],
    ["_lp_", "LaunchDarkly"],
    ["split_", "Split.io"],
    // Customer Engagement
    ["_braze", "Braze"],
    ["__kla_", "Klaviyo"],
    ["_iterable_", "Iterable"],
    // Affiliate & Attribution
    ["_branch_", "Branch.io"], ["branch_", "Branch.io"],
    ["_appsflyer", "AppsFlyer"],
    ["_adjust_", "Adjust"],
    // CMS & E-commerce
    ["wp-", "WordPress"], ["wordpress_", "WordPress"],
    ["_shopify", "Shopify"],
    ["_woo", "WooCommerce"],
    ["_magento", "Magento"],
    // Paywall & Subscription
    ["piano_", "Piano"], ["__tp_", "Piano"],
    ["leaky_paywall_", "Leaky Paywall"],
    ["zuora_", "Zuora"],
    ["chargebee_", "Chargebee"],
    ["recurly_", "Recurly"],
    ["pelcro_", "Pelcro"],
    ["poool_", "Poool"],
    // Bot Detection
    ["_px", "PerimeterX"],
    ["incap_", "Imperva"], ["visid_incap", "Imperva"],
    ["ak_bmsc", "Akamai"], ["bm_", "Akamai"],
    ["datadome", "DataDome"],
    // Session Replay
    ["jarvis_", "Mouseflow"],
    ["_ueq_", "Userpilot"],
    ["pendo_", "Pendo"],
    ["_gainsight_", "Gainsight"],
  ];

  const vendorDomains = {
    // Google
    "doubleclick.net": "DoubleClick",
    "google-analytics.com": "Google Analytics",
    "googleadservices.com": "Google Ads",
    "googlesyndication.com": "Google Ad Manager",
    "googletagmanager.com": "Google Tag Manager",
    "googleapis.com": "Google",
    "youtube.com": "YouTube",
    "ytimg.com": "YouTube",
    // Social & Ads
    "facebook.com": "Meta", "facebook.net": "Meta", "fbcdn.net": "Meta",
    "instagram.com": "Meta",
    "linkedin.com": "LinkedIn",
    "tiktok.com": "TikTok", "tiktokcdn.com": "TikTok",
    "twitter.com": "Twitter/X", "x.com": "Twitter/X", "twimg.com": "Twitter/X",
    "snapchat.com": "Snapchat", "sc-cdn.net": "Snapchat",
    "pinterest.com": "Pinterest",
    "reddit.com": "Reddit",
    "outbrain.com": "Outbrain",
    "taboola.com": "Taboola",
    // Ad Tech
    "criteo.com": "Criteo", "criteo.net": "Criteo",
    "adroll.com": "AdRoll",
    "adsrvr.org": "The Trade Desk",
    "quantserve.com": "Quantcast",
    "bluekai.com": "Oracle BlueKai",
    "demdex.net": "Adobe Audience Manager",
    "krux.net": "Krux/Salesforce DMP",
    "rubiconproject.com": "Rubicon Project",
    "pubmatic.com": "PubMatic",
    "openx.net": "OpenX",
    "casalemedia.com": "Index Exchange",
    "indexww.com": "Index Exchange",
    "bidswitch.net": "Bidswitch",
    "adnxs.com": "Xandr/AppNexus",
    "liveramp.com": "LiveRamp",
    // Consent Management
    "trustarc.com": "TrustArc",
    "onetrust.com": "OneTrust",
    "cookiebot.com": "Cookiebot",
    "didomi.io": "Didomi",
    "sourcepoint.com": "Sourcepoint",
    "usercentrics.eu": "Usercentrics",
    // Analytics & Session Replay
    "hotjar.com": "Hotjar",
    "clarity.ms": "Clarity",
    "mixpanel.com": "Mixpanel",
    "amplitude.com": "Amplitude",
    "heap.io": "Heap",
    "contentsquare.net": "ContentSquare",
    "fullstory.com": "FullStory",
    "logrocket.com": "LogRocket",
    "mouseflow.com": "Mouseflow",
    // Marketing Automation
    "hubspot.com": "HubSpot", "hsforms.com": "HubSpot",
    "marketo.net": "Marketo", "marketo.com": "Marketo",
    "pardot.com": "Pardot",
    "klaviyo.com": "Klaviyo",
    "braze.com": "Braze",
    // CDN & Performance
    "cloudflare.com": "Cloudflare",
    "akamai.net": "Akamai", "akamaized.net": "Akamai",
    "fastly.net": "Fastly",
    "imperva.com": "Imperva", "incapdns.net": "Imperva",
    // Piano
    "piano.io": "Piano", "tinypass.com": "Piano",
    "at-o.net": "Piano Analytics",
    // CDPs
    "segment.io": "Segment", "segment.com": "Segment",
    "rudderstack.com": "RudderStack",
    "tealium.com": "Tealium",
    "mparticle.com": "mParticle",
    "treasuredata.com": "Treasure Data",
    // Customer Data
    "lotame.com": "Lotame",
    "permutive.com": "Permutive",
    "blueconic.net": "BlueConic",
    // A/B Testing
    "optimizely.com": "Optimizely",
    "abtasty.com": "AB Tasty",
    "kameleoon.com": "Kameleoon",
    "dynamicyield.com": "Dynamic Yield",
    // Bot Detection
    "perimeterx.net": "PerimeterX",
    "datadome.co": "DataDome",
    "shapesecurity.com": "Shape Security",
    // Payments
    "stripe.com": "Stripe",
    // Chat
    "drift.com": "Drift",
    "intercom.io": "Intercom",
    "livechatinc.com": "LiveChat",
    "freshworks.com": "Freshworks",
    "zendesk.com": "Zendesk",
  };

  function identifyVendor(cookieName, domain) {
    // 1. Exact match (case-sensitive, then lowercase fallback)
    const exact = vendorExact[cookieName] || vendorExact[cookieName.toLowerCase()];
    if (exact) return exact;
    // 2. Prefix match
    const lower = cookieName.toLowerCase();
    for (const [prefix, vendor] of vendorPrefixes) {
      if (lower.startsWith(prefix)) return vendor;
    }
    // 3. Domain match (if domain provided)
    if (domain) {
      const d = domain.toLowerCase().replace(/^\./, "");
      for (const [domainKey, vendor] of Object.entries(vendorDomains)) {
        if (d === domainKey || d.endsWith("." + domainKey)) return vendor;
      }
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
