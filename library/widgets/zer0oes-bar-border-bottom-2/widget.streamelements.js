const line = document.querySelector(".line-widget");

// === RÉGLAGES (OFFI) ===
const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const HIDE_MS = 700;

// === RÉGLAGES (TEST) ===
// const INTERVAL_MS = 4000;  // toutes les 4s (TEST)
// const HIDE_MS = 900;       // durée cachée (doit être >= transition CSS)

// =======================
if (!line) {
  console.warn("[line-widget] Introuvable");
} else {
  // visible au départ
  line.classList.remove("is-hidden");

  const hideShow = () => {
    // OUT
    line.classList.add("is-hidden");

    // Force le navigateur à “prendre en compte” l’état
    // (sinon parfois pas de transition)
    void line.offsetHeight;

    // IN après un court délai
    setTimeout(() => {
      // On attend un frame avant de retirer (encore plus fiable)
      requestAnimationFrame(() => {
        line.classList.remove("is-hidden");
      });
    }, HIDE_MS);
  };

  // Petit test immédiat après chargement (pratique pour vérifier)
  setTimeout(() => {
    requestAnimationFrame(hideShow);
  }, 300);

  // Boucle
  setInterval(hideShow, INTERVAL_MS);
}