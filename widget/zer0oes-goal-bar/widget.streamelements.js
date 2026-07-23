function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
function num(v){
  const s = String(v ?? "").trim().replace(",", ".");
  const n = Number(s.replace(/[^\d.-]/g,''));
  return Number.isFinite(n) ? n : 0;
}

const iconMap = {
  follows: "favorite",
  subs: "star_shine",
  cheers: "diamond_shine",
  tips: "money_bag"
};

let SETTINGS = {};
let SESSION = null;

// Bases (auto StreamElements) + incréments live
let subsBase = 0, subsAdded = 0;
let followsBase = 0, followsAdded = 0;
let cheersBase = 0, cheersAdded = 0;

// Tips
let tipsBase = 0;
let tipsAdded = 0;
let tipsMonthTotal = 0;

// ------------------------------------
// storage safe
// ------------------------------------
let memoryStore = {};
let persistentStoreReady = false;
let persistentStorePromise = null;
let persistentSaveTimer = null;
const PERSISTENT_STORE_KEY = "novaGoalTips";

function safeGet(key){
  if (Object.prototype.hasOwnProperty.call(memoryStore, key)) return memoryStore[key];
  try { return localStorage.getItem(key); }
  catch(e){ return memoryStore[key] ?? null; }
}

function safeSet(key, value){
  memoryStore[key] = value;
  try { localStorage.setItem(key, value); }
  catch(e){ /* Le sandbox peut interdire localStorage. */ }

  if (persistentStoreReady && globalThis.SE_API?.store?.set){
    clearTimeout(persistentSaveTimer);
    persistentSaveTimer = setTimeout(() => {
      Promise.resolve(SE_API.store.set(PERSISTENT_STORE_KEY, { ...memoryStore })).catch(() => {});
    }, 80);
  }
}

function hydratePersistentStore(){
  if (persistentStoreReady) return Promise.resolve();
  if (persistentStorePromise) return persistentStorePromise;

  persistentStorePromise = (async () => {
    try {
      if (globalThis.SE_API?.store?.get){
        const stored = await SE_API.store.get(PERSISTENT_STORE_KEY);
        if (stored && typeof stored === "object" && !Array.isArray(stored)){
          memoryStore = { ...memoryStore, ...stored };
        }
      }
    } catch(e){
      // Le repli local/mémoire reste disponible si SE_API est indisponible.
    } finally {
      persistentStoreReady = true;
    }
  })();

  return persistentStorePromise;
}

// ------------------------------------
// Google Fonts
// ------------------------------------
function setGoogleFont(family){
  const link = document.getElementById("googleFontLink");
  if (!link) return;

  const name = String(family || "Inter").trim();
  const urlName = name.replace(/\s+/g, "+");
  link.href = `https://fonts.googleapis.com/css2?family=${urlName}:wght@300;400;500;600;700;800&display=swap`;
  document.documentElement.style.setProperty("--font", `"${name}"`);
}

// ------------------------------------
// Normalize helpers
// ------------------------------------
function isYesNo(v){
  const s = String(v ?? "").toLowerCase();
  return s === "yes" || s === "no";
}
function isGoalType(v){
  const s = String(v ?? "").toLowerCase();
  return s === "follows" || s === "subs" || s === "tips" || s === "cheers";
}
function isSource(v){
  const s = String(v ?? "").toLowerCase();
  return s === "auto" || s === "manual";
}
function isDateYYYYMMDD(v){
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// ------------------------------------
// Normalisation du fieldData nommé fourni par StreamElements
// ------------------------------------
function normalizeFields(raw){
  if (Array.isArray(raw)){
    raw = Object.fromEntries(raw.filter(field => field?.name).map(field => [field.name, field.value]));
  }
  raw = raw || {};

  return {
    font_family: String(raw.font_family ?? "Poppins"),
    font_weight: String(raw.font_weight ?? "500"),
    title_size: num(raw.title_size ?? 16),
    value_size: num(raw.value_size ?? 18),
    width: num(raw.width ?? 402),
    height: num(raw.height ?? 38),
    right_width: num(raw.right_width ?? 140),

    goal_type: isGoalType(raw.goal_type) ? String(raw.goal_type) : "tips",
    title: String(raw.title ?? "Donation goal"),
    goal_total: Math.max(1, num(raw.goal_total ?? 500)),

    follows_source: isSource(raw.follows_source) ? String(raw.follows_source) : "auto",
    follows_manual_base: Math.max(0, num(raw.follows_manual_base ?? 0)),
    persist_follows_live: isYesNo(raw.persist_follows_live) ? String(raw.persist_follows_live) : "yes",

    subs_source: isSource(raw.subs_source) ? String(raw.subs_source) : "auto",
    subs_manual_base: Math.max(0, num(raw.subs_manual_base ?? 0)),
    persist_subs_live: isYesNo(raw.persist_subs_live) ? String(raw.persist_subs_live) : "yes",

    monthly_reset: isYesNo(raw.monthly_reset) ? String(raw.monthly_reset) : "no",
    tips_carry_until_goal: isYesNo(raw.tips_carry_until_goal) ? String(raw.tips_carry_until_goal) : "yes",
    tips_start_date: isDateYYYYMMDD(raw.tips_start_date) ? String(raw.tips_start_date) : "",
    tips_start: Math.max(0, num(raw.tips_start ?? 0))
  };
}

function refreshSettingsFromFieldData(raw){
  SETTINGS = normalizeFields(raw || {}) || {};
}

function getSetting(key, fallback){
  return (SETTINGS && SETTINGS[key] != null) ? SETTINGS[key] : fallback;
}

// ------------------------------------
// Totaux session (AUTO StreamElements)
// ------------------------------------
function pickFirstNumber(...vals){
  for (const v of vals){
    if (v !== undefined && v !== null && v !== "") return num(v);
  }
  return null;
}

function readTotalsFromSession(session){
  const s = session || {};
  const d = s?.data || s || {};
  const follows = pickFirstNumber(
    d?.["follower-total"]?.count,
    d?.["followers-total"]?.count,
    d?.["follower-count"]?.count
  );

  const subs = pickFirstNumber(
    d?.["subscriber-total"]?.count,
    d?.["subscriber-count"]?.count,
    d?.["subscribers-count"]?.count,
    d?.["subscriber-points"]?.amount,
    d?.["subscriber-points"]?.count
  );

  const cheers = pickFirstNumber(
    d?.["cheer-total"]?.amount,
    d?.["cheer-total"]?.count
  );

  const tips = pickFirstNumber(
    d?.["tip-total"]?.amount,
    d?.["tips-total"]?.amount
  );

  return { follows, subs, cheers, tips };
}

// ------------------------------------
// Tips helpers
// ------------------------------------
function monthlyTipsEnabled(){
  return String(getSetting("monthly_reset", "no")) === "yes";
}
function carryTipsUntilGoalEnabled(){
  return String(getSetting("tips_carry_until_goal", "yes")) === "yes";
}
function getMonthKey(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
function tipsCampaignKey(){
  const d = String(getSetting("tips_start_date", "") || "").trim();
  const safe = d ? d.replace(/[^\d-]/g, "") : "no_date";
  return `dg_tips_${safe}`;
}

function loadMonthlyTips(){
  if (!monthlyTipsEnabled()) return;

  const keyNow = getMonthKey();
  const camp = tipsCampaignKey();
  const monthKeyStorage = `${camp}_month_key`;
  const totalStorage = `${camp}_month_total`;

  const storedKey = safeGet(monthKeyStorage);

  const savedTotal = num(safeGet(totalStorage));
  tipsMonthTotal = (Number.isFinite(savedTotal) && savedTotal >= 0)
    ? savedTotal
    : num(getSetting("tips_start", 0));

  if (storedKey !== keyNow){
    const target = num(getSetting("goal_total", 0));
    const shouldCarry = carryTipsUntilGoalEnabled();

    if (shouldCarry && target > 0 && tipsMonthTotal < target){
      safeSet(monthKeyStorage, keyNow);
      safeSet(totalStorage, String(tipsMonthTotal));
      return;
    }

    safeSet(monthKeyStorage, keyNow);
    tipsMonthTotal = num(getSetting("tips_start", 0));
    safeSet(totalStorage, String(tipsMonthTotal));
    return;
  }

  if (!storedKey) safeSet(monthKeyStorage, keyNow);
}

function saveMonthlyTips(){
  if (!monthlyTipsEnabled()) return;
  const camp = tipsCampaignKey();
  safeSet(`${camp}_month_total`, String(tipsMonthTotal));
}

// ------------------------------------
// Values
// ------------------------------------
function getFollowersTotal(){ return followsBase + followsAdded; }
function getSubsTotal(){ return subsBase + subsAdded; }
function getTipsTotal(){
  if (monthlyTipsEnabled()){
    loadMonthlyTips();
    return tipsMonthTotal;
  }
  return tipsBase + tipsAdded;
}
function getCheersTotal(){ return cheersBase + cheersAdded; }

function getCurrentValue(type){
  if (type === "follows") return getFollowersTotal();
  if (type === "subs")    return getSubsTotal();
  if (type === "tips")    return getTipsTotal();
  if (type === "cheers")  return getCheersTotal();
  return 0;
}

// ------------------------------------
// Fill
// ------------------------------------
let fillObserverStarted = false;

function applyFillWidth(safePct){
  const fillEl = document.getElementById("fill");
  if (!fillEl) return;

  const goalEl = document.getElementById("goal");
  const leftEl = goalEl ? goalEl.querySelector(".goal-left") : null;

  fillEl.style.width = safePct + "%";
  if (!leftEl) return;

  const setPxIfPossible = () => {
    const lw = leftEl.clientWidth;
    if (lw && lw >= 10){
      const maxPx = Math.max(0, lw - 2);
      fillEl.style.width = ((safePct / 100) * maxPx) + "px";
      return true;
    }
    return false;
  };

  if (!setPxIfPossible()){
    requestAnimationFrame(() => setPxIfPossible() || (fillEl.style.width = safePct + "%"));
  }

  if (!fillObserverStarted && typeof ResizeObserver !== "undefined"){
    fillObserverStarted = true;
    const ro = new ResizeObserver(() => {
      setPxIfPossible() || (fillEl.style.width = safePct + "%");
    });
    ro.observe(leftEl);
  }
}

// ------------------------------------
// Render
// ------------------------------------
function update(){
  if (!SETTINGS) SETTINGS = {};

  const type      = String(getSetting("goal_type", "tips"));
  const target    = num(getSetting("goal_total", 500));
  const title     = String(getSetting("title", "Donation goal"));

  const w         = num(getSetting("width", 400));
  const h         = num(getSetting("height", 32));
  const ff        = String(getSetting("font_family", "Poppins"));
  const fw        = String(getSetting("font_weight", "500"));
  const titleSize = num(getSetting("title_size", 13));
  const valueSize = num(getSetting("value_size", 13));
  const rightWidth = num(getSetting("right_width", 140));

  setGoogleFont(ff);
  document.documentElement.style.setProperty("--titleWeight", fw);

  if (w > 0) document.documentElement.style.setProperty("--w", w + "px");
  if (h > 0) document.documentElement.style.setProperty("--h", h + "px");
  if (titleSize > 0) document.documentElement.style.setProperty("--titleSize", titleSize + "px");
  if (valueSize > 0) document.documentElement.style.setProperty("--valueSize", valueSize + "px");
  if (rightWidth > 0 && rightWidth < w) document.documentElement.style.setProperty("--rightWidth", rightWidth + "px");

  const titleEl = document.getElementById("title");
  if (titleEl) titleEl.textContent = title;

  const iconEl = document.getElementById("goalIcon");
  if (iconEl) iconEl.textContent = iconMap[type] || "money_bag";

  const current = getCurrentValue(type);
  const suffix = (type === "tips") ? "€" : "";

  const curEl = document.getElementById("current");
  const tarEl = document.getElementById("target");
  if (curEl) curEl.textContent = suffix ? `${current}${suffix}` : `${current}`;
  if (tarEl) tarEl.textContent = suffix ? `${target}${suffix}` : `${target}`;

  const pct = target > 0 ? (current / target) * 100 : 0;
  applyFillWidth(clamp(pct, 0, 100));
}

// ------------------------------------
// DEDUPE
// ------------------------------------
const SEEN = new Map();
const DEDUPE_MS = 6000;

function cleanupSeen(){
  const now = Date.now();
  for (const [k, t] of SEEN.entries()){
    if (now - t > DEDUPE_MS) SEEN.delete(k);
  }
}

function eventKey(listener, ev){
  const id = ev?.id ?? ev?._id ?? ev?.eventId ?? ev?.data?.id ?? ev?.data?._id ?? ev?.data?.eventId;
  if (id != null) return `id:${id}`;

  const type = String(ev?.type ?? "");
  const user = ev?.name ?? ev?.username ?? ev?.displayName ?? ev?.data?.name ?? ev?.data?.username ?? "";
  const amount =
    ev?.amount ?? ev?.data?.amount ?? ev?.data?.tipAmount ?? ev?.data?.donationAmount ??
    ev?.data?.count ?? ev?.count ?? ev?.data?.amountGifted ?? ev?.data?.bits ?? "";

  return `sig:${String(listener)}|${type}|${String(user)}|${String(amount)}`;
}

function shouldProcess(listener, ev){
  cleanupSeen();
  const key = eventKey(listener, ev);
  if (SEEN.has(key)) return false;
  SEEN.set(key, Date.now());
  return true;
}

// ------------------------------------
// Events
// ------------------------------------
function handleEvent(obj){
  const listener = String(obj?.detail?.listener || "").toLowerCase();
  const ev = obj?.detail?.event || null;
  if (!ev) return;

  if (!shouldProcess(listener, ev)) return;

  const type = String(ev.type || "").toLowerCase();

  // FOLLOW
  if (type === "follow" || listener.includes("follower")){
    if (String(getSetting("persist_follows_live", "yes")) === "yes"){
      followsAdded += 1;
      update();
    }
    return;
  }

  // TIPS
  const isTip =
    type.includes("tip") || type.includes("donation") ||
    listener.includes("tip") || listener.includes("donation");

  if (isTip){
    const amount = num(
      ev.amount ??
      ev.tipAmount ??
      ev.donationAmount ??
      ev.total ??
      ev?.data?.amount ??
      ev?.data?.tipAmount ??
      ev?.data?.donationAmount ??
      ev?.data?.total ??
      0
    );

    if (amount > 0){
      if (monthlyTipsEnabled()){
        loadMonthlyTips();
        tipsMonthTotal += amount;
        saveMonthlyTips();
      }else{
        tipsAdded += amount;
      }
      update();
    }
    return;
  }

  // CHEERS / BITS
  const isCheer =
    type.includes("cheer") || type.includes("bits") || type.includes("bit") ||
    listener.includes("cheer") || listener.includes("bits");

  if (isCheer){
    const bits = num(
      ev.amount ??
      ev.bits ??
      ev?.data?.amount ??
      ev?.data?.bits ??
      ev?.data?.total ??
      0
    );

    if (bits > 0){
      cheersAdded += bits;
      update();
    }
    return;
  }

  // SUBS
  if (String(getSetting("persist_subs_live", "no")) === "yes"){
    const looksLikeSub =
      listener.includes("sub") || listener.includes("subscriber") || listener.includes("subscription") ||
      type.includes("sub") || type.includes("subscriber") || type.includes("subscription") || type.includes("resub");

    const looksLikeGift =
      listener.includes("gift") || type.includes("gift") || type.includes("communitygift") || type.includes("subgift");

    if (looksLikeGift){
      const count = num(
        ev?.data?.amount ??
        ev?.data?.count ??
        ev?.data?.gifted ??
        ev?.data?.amountGifted ??
        ev?.amount ??
        ev?.count ??
        1
      );
      subsAdded += Math.max(1, count);
      update();
      return;
    }

    if (looksLikeSub){
      subsAdded += 1;
      update();
      return;
    }
  }
}

// ------------------------------------
// Init
// ------------------------------------
async function boot(rawFieldData){
  refreshSettingsFromFieldData(rawFieldData);
  const totals = readTotalsFromSession(SESSION);

  // Followers base
  if (String(getSetting("follows_source", "auto")) === "manual"){
    followsBase = num(getSetting("follows_manual_base", 0));
  } else {
    followsBase = totals.follows ?? followsBase ?? 0;
  }

  // Cheers auto
  cheersBase = totals.cheers ?? cheersBase ?? 0;

  // Subs base
  if (String(getSetting("subs_source", "auto")) === "manual"){
    subsBase = num(getSetting("subs_manual_base", 0));
  } else {
    subsBase = totals.subs ?? subsBase ?? 0;
  }

  tipsBase = num(getSetting("tips_start", 0));

  followsAdded = 0;
  subsAdded = 0;
  cheersAdded = 0;
  tipsAdded = 0;
  tipsMonthTotal = 0;

  if (monthlyTipsEnabled()){
    await hydratePersistentStore();
    loadMonthlyTips();
  }

  update();
  requestAnimationFrame(update);
}

window.addEventListener("onWidgetLoad", (obj) => {
  SESSION = obj?.detail?.session || null;
  void boot(obj?.detail?.fieldData || {});
});

window.addEventListener("onWidgetUpdate", (obj) => {
  void boot(obj?.detail?.fieldData || {});
});

window.addEventListener("onSessionUpdate", (obj) => {
  const sess = obj?.detail?.session;
  if (!sess) return;

  SESSION = sess;
  const totals = readTotalsFromSession(SESSION);

  if (String(getSetting("follows_source", "auto")) !== "manual"){
    if (totals.follows !== null){
      followsBase = totals.follows;
      followsAdded = 0;
    }
  }
  if (totals.cheers !== null){
    cheersBase = totals.cheers;
    cheersAdded = 0;
  }
  if (String(getSetting("subs_source", "auto")) !== "manual"){
    if (totals.subs !== null){
      subsBase = totals.subs;
      subsAdded = 0;
    }
  }

  update();
});

window.addEventListener("onEventReceived", (obj) => {
  handleEvent(obj);
});
