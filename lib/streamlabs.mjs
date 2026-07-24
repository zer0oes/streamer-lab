const EVENT_LISTENERS = {
  follow: "follower-latest",
  subscription: "subscriber-latest",
  donation: "tip-latest",
  host: "host-latest",
  bits: "cheer-latest",
  raid: "raid-latest"
};

/** Convertit un evenement recu du Socket API Streamlabs vers la forme interne du laboratoire. */
export function streamlabsEventToLabEvents(eventData) {
  if (!eventData || typeof eventData !== "object") return [];

  const listener = EVENT_LISTENERS[eventData.type];
  if (!listener) return [];

  const items = Array.isArray(eventData.message) ? eventData.message : [];

  return items.map((item) => ({
    type: "onEventReceived",
    detail: {
      listener,
      event: {
        ...item,
        name: item?.name ?? "Anonyme",
        amount: toNumber(item?.amount ?? item?.viewers ?? 0),
        message: item?.message ?? "",
        _raw: item
      }
    }
  }));
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
