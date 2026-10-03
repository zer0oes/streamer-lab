/* Local Widget Lab — pont automatique StreamElements → Streamlabs */
(function () {
  if (window.__localWidgetLabStreamlabsBridge) return;
  window.__localWidgetLabStreamlabsBridge = true;

  const valuesFrom = (customJson) => Object.fromEntries(
    Object.entries(customJson || {}).map(([key, field]) => [
      key,
      field && typeof field === "object" && "value" in field ? field.value : field
    ])
  );
  const listenerByType = {
    follow: "follower-latest",
    subscription: "subscriber-latest",
    subscriber: "subscriber-latest",
    sub: "subscriber-latest",
    donation: "tip-latest",
    tip: "tip-latest",
    bits: "cheer-latest",
    cheer: "cheer-latest",
    raid: "raid-latest",
    message: "message"
  };

  if (!window.SE_API) {
    window.SE_API = {
      store: {
        get: async (key) => JSON.parse(localStorage.getItem("widgetLab." + key) || "null"),
        set: async (key, value) => localStorage.setItem("widgetLab." + key, JSON.stringify(value))
      },
      counters: { get: async () => ({ count: 0 }) },
      sanitize: async (message) => message,
      cheerFilter: async (message) => message,
      getOverlayStatus: async () => ({ isEditorMode: false, muted: false }),
      setField: () => {},
      resumeQueue: () => {}
    };
  }

  document.addEventListener("onLoad", function (obj) {
    const detail = obj.detail || {};
    const fieldData = valuesFrom(detail.custom_json || detail.customFields || detail.fieldData);
    window.dispatchEvent(new CustomEvent("onWidgetLoad", { detail: {
      fieldData,
      session: { data: detail.session || {} },
      recents: [],
      currency: { code: "EUR", name: "Euro", symbol: "€" },
      channel: {}
    }}));
  });

  document.addEventListener("onEventReceived", function (obj) {
    const source = obj.detail || {};
    const type = String(source.type || source.tag || "event").toLowerCase();
    const listener = listenerByType[type] || type;
    const event = type === "message"
      ? { data: { ...source, text: source.text || source.message || "", displayName: source.displayName || source.name || source.from || "Viewer" } }
      : { ...source, name: source.name || source.from || "Viewer", amount: source.amount || source.viewers || 0 };
    window.dispatchEvent(new CustomEvent("onEventReceived", { detail: { listener, event } }));
  });
})();

// TV - Chat : salon de TomaVega-animation.html, branché sur le vrai tchat
// (messages, emotes, suppressions). Logique reprise de zer0oes - Neon Chat.
// Seuls les messages du tchat du stream s'affichent, plus les messages
// d'essai envoyés à la demande par le bouton « Message d'essai ».
const chat = document.getElementById("chat");

// Messages d'essai, en alternance viewers / streamer pour voir chaque style
const TEST_MESSAGES = [
  { displayName: "PixelWave", text: "Le son est bon, on est prêts 🔥", badges: [{ type: "moderator" }] },
  { displayName: "TomaVega", text: "Merci à tous ! On arrive 💚", badges: [{ type: "broadcaster" }] },
  { displayName: "Nova", text: "Ça fait plaisir de retrouver le tchat !", badges: [{ type: "artist-badge" }] },
  { displayName: "Luna", text: "Petite soirée tranquille avec vous ✨", badges: [{ type: "subscriber" }] },
  { displayName: "Echo", text: "Un message un peu plus long, pour vérifier le retour à la ligne dans le salon.", badges: [] }
];

// Rôle affiché d'après les badges Twitch (le plus important d'abord)
const ROLES = [
  ["broadcaster", "role_broadcaster", "Streamer"],
  ["moderator", "role_moderator", "Modérateur"],
  ["vip", "role_vip", "VIP"],
  ["artist-badge", "role_artist", "Artiste"],
  ["subscriber", "role_subscriber", "Sub"],
  ["founder", "role_subscriber", "Sub"]
];

function roleLabel(badges){
  const types = new Set(badges.map((badge) => badge?.type));
  const role = ROLES.find(([type]) => types.has(type));
  return role ? String(fields[role[1]] ?? role[2]) : "";
}

let fields = {};
let ignoredUsers = new Set();
let messageCount = 0;
let nextTestMessage = 0;

// ------------------------------------
// Diagnostic (champ « Diagnostic ») : petite ligne sous l'en-tête avec les
// évènements reçus, pour vérifier dans OBS que le tchat arrive bien
// ------------------------------------
const diagnostic = { loaded: false, events: 0, messages: 0, shown: 0, last: "", error: "" };

function updateDiagnostic(){
  let line = document.getElementById("chatDiagnostic");
  if (fields.diagnostic !== "yes"){
    line?.remove();
    return;
  }
  if (!line){
    line = document.createElement("div");
    line.id = "chatDiagnostic";
    line.className = "chat-diagnostic";
    document.querySelector(".chat-slot").append(line);
  }
  const size = chat.clientWidth + "×" + chat.clientHeight;
  line.textContent = (diagnostic.loaded ? "Chargé" : "Pas de onWidgetLoad") +
    " · évènements " + diagnostic.events + " (dernier : " + (diagnostic.last || "aucun") + ")" +
    " · messages reçus " + diagnostic.messages + " · affichés " + chat.childElementCount +
    " · salon " + size + (diagnostic.error ? " · erreur : " + diagnostic.error : "");
}

function addTestMessage(){
  const sample = TEST_MESSAGES[nextTestMessage++ % TEST_MESSAGES.length];
  addMessage({
    displayName: sample.displayName,
    nick: sample.displayName.toLowerCase(),
    text: sample.text,
    badges: sample.badges || [],
    emotes: [],
    userId: "essai-" + sample.displayName,
    msgId: "essai-" + Date.now() + "-" + nextTestMessage
  });
}

window.addEventListener("onWidgetLoad", ({ detail }) => {
  fields = detail?.fieldData || {};
  ignoredUsers = new Set(String(fields.ignored_users || "").split(",").map((name) => name.trim().toLowerCase()).filter(Boolean));
  document.getElementById("chatTitle").textContent = fields.chat_title ?? "LE SALON";
  document.getElementById("chatSubtitle").textContent = fields.chat_subtitle ?? "TOMAVEGA / COMMUNITY";
  diagnostic.loaded = true;
  updateDiagnostic();
});

window.addEventListener("onWidgetUpdate", ({ detail }) => {
  fields = detail?.fieldData || fields;
  updateDiagnostic();
});

window.addEventListener("onEventReceived", ({ detail }) => {
  const event = detail?.event || {};
  const listener = detail?.listener || event.listener;
  diagnostic.events += 1;
  diagnostic.last = String(listener || "?");
  try {
    handleEvent(listener, event);
  } catch (error){
    diagnostic.error = String(error?.message || error);
    console.error("[TV - Chat]", error);
  }
  updateDiagnostic();
});

function handleEvent(listener, event){

  // Bouton « Message d'essai » (sur un overlay, le clic est envoyé à tous les
  // widgets : on ne réagit qu'à notre propre champ)
  if (listener === "widget-button"){
    if (event.field === "test_message") addTestMessage();
    return;
  }
  if (listener === "delete-message"){
    chat.querySelectorAll('[data-msgid="' + CSS.escape(String(event.msgId)) + '"]').forEach(removeRow);
    return;
  }
  if (listener === "delete-messages"){
    chat.querySelectorAll('[data-sender="' + CSS.escape(String(event.userId)) + '"]').forEach(removeRow);
    return;
  }
  if (listener !== "message") return;

  const data = event.data || event;
  diagnostic.messages += 1;
  const nickname = String(data.nick || data.displayName || "").toLowerCase();
  const text = String(data.text || "");
  if (fields.hide_commands !== "no" && text.trimStart().startsWith("!")) return;
  if (ignoredUsers.has(nickname)) return;

  addMessage(data);
}

function addMessage(data){
  const badges = Array.isArray(data.badges) ? data.badges : [];
  const isBroadcaster = badges.some((badge) => badge?.type === "broadcaster");
  const name = String(data.displayName || data.nick || "Anonyme");

  const row = document.createElement("div");
  row.className = "chat-message";
  // Alternance cyan / violet, comme sur la page d'origine
  if (messageCount++ % 2 === 1) row.classList.add("is-alt");
  if (isBroadcaster) row.classList.add("broadcaster");
  row.dataset.msgid = String(data.msgId || data.tags?.id || "msg-" + Date.now() + "-" + messageCount);
  row.dataset.sender = String(data.userId || data.tags?.["user-id"] || "");

  const meta = document.createElement("div");
  meta.className = "chat-meta";
  const nameEl = document.createElement("span");
  nameEl.className = "chat-name";
  nameEl.textContent = name;
  const role = document.createElement("span");
  role.className = "chat-role";
  role.textContent = roleLabel(badges);
  meta.append(nameEl, role);

  const content = document.createElement("p");
  renderMessage(content, data);
  row.append(meta, content);

  const previousPositions = new Map([...chat.children].map((previous) => [previous, previous.getBoundingClientRect().top]));
  chat.querySelectorAll(".chat-message.latest").forEach((previous) => previous.classList.remove("latest", "entering"));
  row.classList.add("latest", "entering");
  chat.append(row);
  trimToLimit();
  slideUp(previousPositions);
  scheduleRemoval(row);
}

function renderMessage(container, data){
  const text = String(data.text || "");
  const emotes = (Array.isArray(data.emotes) ? data.emotes : [])
    .filter((emote) => Number.isFinite(Number(emote.start)) && Number.isFinite(Number(emote.end)))
    .sort((a, b) => Number(a.start) - Number(b.start));

  if (!emotes.length){
    const byName = new Map((Array.isArray(data.emotes) ? data.emotes : []).filter((emote) => emote?.name).map((emote) => [emote.name, emote]));
    for (const part of text.split(/(\s+)/)){
      const emote = byName.get(part);
      container.append(emote ? createEmoteImage(emote) : document.createTextNode(part));
    }
    return;
  }

  let cursor = 0;
  for (const emote of emotes){
    const start = Number(emote.start);
    const end = Number(emote.end);
    if (start < cursor || end < start) continue;
    container.append(document.createTextNode(text.slice(cursor, start)), createEmoteImage(emote));
    cursor = end + 1;
  }
  container.append(document.createTextNode(text.slice(cursor)));
}

function createEmoteImage(emote){
  const image = document.createElement("img");
  image.className = "emote";
  image.src = emote.urls?.[2] || emote.urls?.[1] || emote.url || "";
  image.alt = emote.name || "Emote";
  return image;
}

// Garde au plus « Messages affichés ». Le salon se remplit jusqu'en haut : le
// plus ancien n'est retiré que si les suivants suffisent à occuper toute la
// hauteur (il peut donc être coupé sous le fondu du haut, comme sur la page).
// Hauteur mesurée message par message (offsetHeight ignore les transformations :
// l'animation d'entrée ne doit pas faire croire à un débordement).
function trimToLimit(){
  const limit = Math.max(1, Number(fields.max_messages) || 6);
  while (chat.childElementCount > limit) chat.firstElementChild?.remove();

  // Dans OBS, la source peut être chargée avant d'avoir sa taille (salon de
  // hauteur nulle) : on ne retire rien sur la hauteur tant que ce n'est pas
  // le cas, sinon tous les messages sauf le dernier disparaîtraient. Le tri
  // reprend au redimensionnement.
  const style = getComputedStyle(chat);
  const available = chat.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  if (available <= 0) return;
  const gap = parseFloat(style.rowGap) || 0;
  const contentHeight = () => [...chat.children].reduce((sum, row) => sum + row.offsetHeight, 0) + Math.max(0, chat.childElementCount - 1) * gap;
  while (chat.childElementCount > 1 && contentHeight() - chat.firstElementChild.offsetHeight - gap >= available) chat.firstElementChild?.remove();
}

// Les messages déjà affichés remontent en douceur pour laisser la place
function slideUp(previousPositions){
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (const [row, top] of previousPositions){
    if (!row.isConnected) continue;
    const shift = top - row.getBoundingClientRect().top;
    if (Math.abs(shift) < 0.5) continue;
    row.animate([{ transform: "translateY(" + shift + "px)" }, { transform: "translateY(0)" }], { duration: 500, easing: "cubic-bezier(.2,.7,.2,1)" });
  }
}

function scheduleRemoval(row){
  const seconds = Number(fields.hide_after);
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  setTimeout(() => removeRow(row), seconds * 1000);
}

function removeRow(row){
  if (!row?.isConnected || row.classList.contains("is-leaving")) return;
  row.classList.add("is-leaving");
  setTimeout(() => row.remove(), 450);
}

window.addEventListener("resize", () => {
  trimToLimit();
  updateDiagnostic();
});
if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => trimToLimit()).observe(chat);
