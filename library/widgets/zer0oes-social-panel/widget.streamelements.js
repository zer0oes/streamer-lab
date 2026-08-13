const socialsEl = document.getElementById("socials");
const fontLink = document.getElementById("googleFontLink");

let timer = null;

const SOCIALS_CONFIG = [
  { key: "youtube",   icon: "fa-brands fa-youtube",   label: "YouTube" },
  { key: "twitch",    icon: "fa-brands fa-twitch",    label: "Twitch" },
  { key: "instagram", icon: "fa-brands fa-instagram", label: "Instagram" },
  { key: "tiktok",    icon: "fa-brands fa-tiktok",    label: "TikTok" },
  { key: "x",         icon: "fa-brands fa-x-twitter", label: "X" },
  { key: "facebook",  icon: "fa-brands fa-facebook",  label: "Facebook" }
];

/* =========================
   Utils
========================= */
function num(v, fallback = 0) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}
function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/* =========================
   Google Fonts
========================= */
async function loadGoogleFont(family, weight = "500") {
  if (!fontLink) return;

  const fam = String(family || "Poppins").trim();
  const famParam = encodeURIComponent(fam).replace(/%20/g, "+");
  fontLink.href =
    `https://fonts.googleapis.com/css2?family=${famParam}:wght@300;400;500;600;700&display=swap`;

  try {
    if (document.fonts?.load) {
      await document.fonts.load(`${weight} 16px "${fam}"`);
      await document.fonts.ready;
    }
  } catch (_) {}
}

/* =========================
   Normalize fieldData
   - nommé OU indexé (0..17)
========================= */
function normalizeFields(raw) {
  // Cas nommé
  if (raw && (raw.youtubeEnabled !== undefined || raw.animItemMs !== undefined || raw.fontFamily !== undefined)) {
    return {
      youtubeEnabled:   !!raw.youtubeEnabled,
      youtubeName:      String(raw.youtubeName || "").trim(),

      twitchEnabled:    !!raw.twitchEnabled,
      twitchName:       String(raw.twitchName || "").trim(),

      instagramEnabled: !!raw.instagramEnabled,
      instagramName:    String(raw.instagramName || "").trim(),

      tiktokEnabled:    !!raw.tiktokEnabled,
      tiktokName:       String(raw.tiktokName || "").trim(),

      xEnabled:         !!raw.xEnabled,
      xName:            String(raw.xName || "").trim(),

      facebookEnabled:  !!raw.facebookEnabled,
      facebookName:     String(raw.facebookName || "").trim(),

      animItemMs:  clamp(num(raw.animItemMs, 2000), 300, 600000),

      fontFamily: raw.fontFamily || "Poppins",
      fontSize: clamp(num(raw.fontSize, 13), 1, 200),
      fontWeight: String(raw.fontWeight || "500"),
      textColor: raw.textColor || "#FFFFFF",
    };
  }

  // Cas indexé
  const get = (i, fallback) => raw?.[String(i)] ?? raw?.[i] ?? fallback;

  return {
    youtubeEnabled:   !!get(0, true),
    youtubeName:      String(get(1, "")).trim(),

    twitchEnabled:    !!get(2, true),
    twitchName:       String(get(3, "")).trim(),

    instagramEnabled: !!get(4, true),
    instagramName:    String(get(5, "")).trim(),

    tiktokEnabled:    !!get(6, true),
    tiktokName:       String(get(7, "")).trim(),

    xEnabled:         !!get(8, true),
    xName:            String(get(9, "")).trim(),

    facebookEnabled:  !!get(10, true),
    facebookName:     String(get(11, "")).trim(),

    animItemMs:  clamp(num(get(13, 2000), 2000), 300, 600000),

    fontFamily: String(get(14, "Poppins") || "Poppins"),
    fontSize: clamp(num(get(15, 13), 13), 1, 200),
    fontWeight: String(get(16, "500") || "500"),
    textColor: String(get(17, "#FFFFFF") || "#FFFFFF"),
  };
}

/* =========================
   Styles
========================= */
async function applyStyles(data) {
  await loadGoogleFont(data.fontFamily, data.fontWeight);

  if (!socialsEl) return;
  socialsEl.style.setProperty("color", data.textColor, "important");
  socialsEl.style.setProperty("font-family", `'${data.fontFamily}', sans-serif`, "important");
  socialsEl.style.setProperty("font-size", `${data.fontSize}px`, "important");
  socialsEl.style.setProperty("font-weight", data.fontWeight, "important");
}

/* =========================
   Build list
========================= */
function buildSocialList(data) {
  const list = [];
  SOCIALS_CONFIG.forEach(({ key, icon, label }) => {
    const enabled = !!data[`${key}Enabled`];
    const name = String(data[`${key}Name`] || "").trim();
    if (!enabled || !name) return;
    list.push({ icon, label, name });
  });
  return list;
}

/* =========================
   Render
========================= */
function renderSocial(item, itemMs) {
  if (!socialsEl) return;

  socialsEl.innerHTML = `
    <div class="row">
      <i class="icon anim ${item.icon}" aria-hidden="true"></i>
      <span class="name anim">${item.name}</span>
    </div>
  `;

  const iconEl = socialsEl.querySelector(".icon.anim");
  const nameEl = socialsEl.querySelector(".name.anim");

  // Durée = itemMs (même durée pour move + fade)
  const dur = `${itemMs}ms, ${itemMs}ms`;
  if (iconEl) iconEl.style.animationDuration = dur;
  if (nameEl) nameEl.style.animationDuration = dur;
}

/* =========================
   Loop
   ✅ on redraw au début de chaque cycle
========================= */
function startLoop(list, itemMs) {
  clearInterval(timer);

  if (!socialsEl) return;

  if (!list.length) {
    socialsEl.innerHTML = "";
    return;
  }

  let index = 0;
  renderSocial(list[index], itemMs);

  timer = setInterval(() => {
    index = (index + 1) % list.length;
    renderSocial(list[index], itemMs);
  }, itemMs);
}

/* =========================
   Init
========================= */
async function init(fieldData) {
  if (!socialsEl) return;

  const data = normalizeFields(fieldData);
  await applyStyles(data);

  const list = buildSocialList(data);
  startLoop(list, data.animItemMs);
}

window.addEventListener("onWidgetLoad", (obj) => {
  init(obj?.detail?.fieldData || {});
});

window.addEventListener("onWidgetUpdate", (obj) => {
  init(obj?.detail?.fieldData || {});
});
