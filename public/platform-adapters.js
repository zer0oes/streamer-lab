export const PLATFORM_STREAM_ELEMENTS = "streamelements";
export const PLATFORM_STREAMLABS = "streamlabs";

export function normalizePlatform(value) {
  return value === PLATFORM_STREAMLABS ? PLATFORM_STREAMLABS : PLATFORM_STREAM_ELEMENTS;
}

export function buildStreamlabsLoadDetail(definitions, values, session = {}) {
  const customJson = Object.fromEntries(
    Object.entries(definitions || {}).map(([name, definition]) => [name, {
      ...definition,
      name,
      value: values?.[name] ?? definition.value
    }])
  );

  return {
    custom_json: customJson,
    customFields: customJson,
    fieldData: { ...values },
    session
  };
}

export function toStreamlabsEvent(detail = {}) {
  const listener = String(detail.listener || "").toLowerCase();
  const event = detail.event || {};
  const data = event.data || {};
  const type = ({
    "follower-latest": "follow",
    "subscriber-latest": "subscription",
    "tip-latest": "donation",
    "cheer-latest": "bits",
    "raid-latest": "raid",
    message: "message"
  })[listener] || String(event.type || listener.replace(/-latest$/, "") || "event").toLowerCase();

  const name = event.name || event.from || data.displayName || data.nick || "Viewer";
  const amount = Number(event.amount ?? data.amount ?? 0) || 0;
  const message = event.message ?? data.text ?? data.message ?? "";
  const platform = event.platform || data.platform || "twitch_account";

  return {
    ...event,
    ...data,
    type,
    tag: event.tag || type,
    name,
    from: event.from || name,
    amount,
    message,
    text: data.text ?? event.text ?? message,
    platform,
    isTest: event.isTest ?? true,
    payload: event.payload || data,
    ...(type === "raid" ? { viewers: Number(event.viewers ?? amount) || 0 } : {}),
    ...(type === "donation" ? {
      currency: event.currency || "EUR",
      formattedAmount: event.formattedAmount || `${amount.toFixed(2)} €`
    } : {})
  };
}
