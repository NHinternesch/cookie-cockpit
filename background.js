// Cookie Cockpit — Background Service Worker

const dashboardConnections = new Map(); // port → { sourceHost, domains }

// Persist scan data in session storage so it survives service worker restarts
async function getScan(tabId) {
  const key = `scan_${tabId}`;
  const data = await chrome.storage.session.get(key);
  return data[key] || null;
}

async function setScan(tabId, scanData) {
  const key = `scan_${tabId}`;
  await chrome.storage.session.set({ [key]: scanData });
}

async function removeScan(tabId) {
  const key = `scan_${tabId}`;
  await chrome.storage.session.remove(key);
}

chrome.action.onClicked.addListener(async (tab) => {
  // Capture a screenshot of the visible tab
  let screenshot = null;
  try {
    screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: "png",
    });
  } catch {}

  // Inject a script to discover all domains with loaded resources (all frames)
  let domains = [];
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: collectPageDomains,
    });
    // Merge domains discovered in every frame
    for (const r of results) {
      if (r?.result) {
        domains.push(...r.result);
      }
    }
  } catch {}

  await setScan(tab.id, { url: tab.url, domains, screenshot });

  const dashboardUrl = chrome.runtime.getURL(
    `dashboard/index.html?url=${encodeURIComponent(tab.url)}&tabId=${tab.id}&title=${encodeURIComponent(tab.title || "")}`
  );
  chrome.tabs.create({ url: dashboardUrl });
});

function collectPageDomains() {
  const domains = new Set();
  // Include this frame's own hostname
  try {
    domains.add(location.hostname);
  } catch {}
  for (const entry of performance.getEntriesByType("resource")) {
    try {
      domains.add(new URL(entry.name).hostname);
    } catch {}
  }
  const selectors =
    "script[src], img[src], iframe[src], link[href], video[src], audio[src], source[src], object[data]";
  for (const el of document.querySelectorAll(selectors)) {
    const url = el.src || el.href || el.data;
    if (url) {
      try {
        domains.add(new URL(url, location.origin).hostname);
      } catch {}
    }
  }
  return [...domains];
}

// --- Dashboard connections ---

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "cookie-cockpit-dashboard") return;

  port.onMessage.addListener(async (msg) => {
    if (msg.type === "set-cookie") {
      try {
        const c = msg.cookie;
        const scheme = c.secure ? "https" : "http";
        const domain = c.domain.startsWith(".") ? c.domain.slice(1) : c.domain;
        const url = `${scheme}://${domain}${c.path}`;
        const details = {
          url,
          name: c.name,
          value: msg.value,
          domain: c.domain,
          path: c.path,
          secure: c.secure,
          httpOnly: c.httpOnly,
          sameSite: c.sameSite,
          storeId: c.storeId,
        };
        if (!c.session && c.expirationDate) {
          details.expirationDate = c.expirationDate;
        }
        const result = await chrome.cookies.set(details);
        if (result) {
          port.postMessage({ type: "set-cookie-result", success: true });
        } else {
          port.postMessage({
            type: "set-cookie-result",
            success: false,
            error: chrome.runtime.lastError?.message || "Failed to set cookie",
          });
        }
      } catch (err) {
        try {
          port.postMessage({
            type: "set-cookie-result",
            success: false,
            error: String(err?.message || err),
          });
        } catch {}
      }
      return;
    }
    if (msg.type === "remove-cookie") {
      try {
        const c = msg.cookie;
        const scheme = c.secure ? "https" : "http";
        const domain = c.domain.startsWith(".") ? c.domain.slice(1) : c.domain;
        const url = `${scheme}://${domain}${c.path}`;
        await chrome.cookies.remove({ url, name: c.name, storeId: c.storeId });
        port.postMessage({ type: "remove-cookie-result", success: true });
      } catch (err) {
        try {
          port.postMessage({
            type: "remove-cookie-result",
            success: false,
            error: String(err?.message || err),
          });
        } catch {}
      }
      return;
    }
    if (msg.type === "remove-all-cookies") {
      let removed = 0;
      let failed = 0;
      for (const c of msg.cookies) {
        try {
          const scheme = c.secure ? "https" : "http";
          const domain = c.domain.startsWith(".") ? c.domain.slice(1) : c.domain;
          const url = `${scheme}://${domain}${c.path}`;
          await chrome.cookies.remove({ url, name: c.name, storeId: c.storeId });
          removed++;
        } catch {
          failed++;
        }
      }
      try {
        port.postMessage({
          type: "remove-all-cookies-result",
          success: failed === 0,
          removed,
          failed,
        });
      } catch {}
      return;
    }
    if (msg.type === "get-cookies") {
      const tabId = msg.tabId;
      const scan = await getScan(tabId);
      const sourceUrl = msg.url || scan?.url || "";
      const pageDomains = scan?.domains || [];
      const screenshot = scan?.screenshot || null;

      let sourceHost = "";
      try {
        sourceHost = new URL(sourceUrl).hostname;
      } catch {}

      const relevantDomains = new Set(pageDomains);
      if (sourceHost) relevantDomains.add(sourceHost);

      dashboardConnections.set(port, { sourceHost, domains: relevantDomains });

      fetchCookiesForDomains(sourceUrl, sourceHost, relevantDomains).then(
        (cookies) => {
          port.postMessage({ type: "cookies", cookies, screenshot });
        }
      );
    }
  });

  port.onDisconnect.addListener(() => {
    dashboardConnections.delete(port);
  });
});

// --- Clean up scan data when the original tab is closed ---

chrome.tabs.onRemoved.addListener((tabId) => {
  removeScan(tabId);
});

// --- Cookie change events — scoped per dashboard ---

chrome.cookies.onChanged.addListener((changeInfo) => {
  for (const [port, ctx] of dashboardConnections) {
    if (!isDomainRelevant(changeInfo.cookie.domain, ctx.domains)) continue;
    try {
      port.postMessage({
        type: "cookie-changed",
        removed: changeInfo.removed,
        cookie: normalizeCookie(
          changeInfo.cookie,
          isFirstPartyDomain(changeInfo.cookie.domain, ctx.sourceHost)
        ),
        cause: changeInfo.cause,
        timestamp: Date.now(),
      });
    } catch {
      dashboardConnections.delete(port);
    }
  }
});

// --- Cookie fetching ---

async function fetchCookiesForDomains(sourceUrl, sourceHost, domains) {
  const seen = new Set();
  const result = [];

  function addCookie(c) {
    const key = `${c.domain}|${c.path}|${c.name}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(
      normalizeCookie(c, isFirstPartyDomain(c.domain, sourceHost))
    );
  }

  for (const domain of domains) {
    // Query by domain — returns cookies set on this exact domain & subdomains
    try {
      for (const c of await chrome.cookies.getAll({ domain })) addCookie(c);
    } catch {}
    // Query by URL — also returns parent-domain cookies that would be sent
    // to this domain (e.g. .facebook.com cookies for pixel.facebook.com)
    try {
      for (const c of await chrome.cookies.getAll({ url: `https://${domain}/` })) addCookie(c);
    } catch {}
    try {
      for (const c of await chrome.cookies.getAll({ url: `http://${domain}/` })) addCookie(c);
    } catch {}
  }

  if (sourceUrl) {
    try {
      for (const c of await chrome.cookies.getAll({ url: sourceUrl })) addCookie(c);
    } catch {}
  }

  return result;
}

// --- Helpers ---

function isDomainRelevant(cookieDomain, relevantDomains) {
  const bare = cookieDomain.startsWith(".")
    ? cookieDomain.slice(1)
    : cookieDomain;
  for (const d of relevantDomains) {
    if (d === bare || d.endsWith("." + bare) || bare.endsWith("." + d))
      return true;
  }
  return false;
}

function isFirstPartyDomain(cookieDomain, sourceHost) {
  if (!sourceHost) return false;
  const bare = cookieDomain.startsWith(".")
    ? cookieDomain.slice(1)
    : cookieDomain;
  return sourceHost === bare || sourceHost.endsWith("." + bare);
}

function normalizeCookie(c, firstParty) {
  return {
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path,
    secure: c.secure,
    httpOnly: c.httpOnly,
    sameSite: c.sameSite,
    expirationDate: c.expirationDate || null,
    session: c.session,
    storeId: c.storeId,
    size: (c.name + c.value).length,
    firstParty: !!firstParty,
  };
}
