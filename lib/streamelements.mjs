const ACTIVITY_LISTENERS = {
  follow: "follower-latest",
  follower: "follower-latest",
  subscriber: "subscriber-latest",
  sponsor: "subscriber-latest",
  supporter: "subscriber-latest",
  sponsorship: "subscriber-latest",
  sponsorshipPassive: "subscriber-latest",
  communityGiftPurchase: "subscriber-latest",
  tip: "tip-latest",
  superchat: "tip-latest",
  cheer: "cheer-latest",
  cheerPurchase: "cheer-latest",
  stars: "cheer-latest",
  raid: "raid-latest",
  host: "host-latest"
};

/** Convertit une activite Astro vers la forme recue par un Custom Widget. */
export function activityToWidgetEvent(activity) {
  if (!activity || typeof activity !== "object") return null;

  const listener = ACTIVITY_LISTENERS[activity.type];
  if (!listener) return null;

  const source = activity.data && typeof activity.data === "object" ? activity.data : {};
  const name = source.displayName ?? source.username ?? source.name ?? "Anonyme";

  return {
    listener,
    event: {
      ...source,
      name,
      amount: source.amount ?? activity.amount ?? 0,
      message: source.message ?? activity.message ?? "",
      provider: activity.provider,
      activityId: activity.activityId ?? activity._id,
      _raw: activity
    }
  };
}

/** Ramene les payloads Twitch, YouTube et Kick d'Astro vers event.data du widget. */
export function chatMessageToWidgetData(raw) {
  if (!raw || typeof raw !== "object") return raw;

  if (raw.chatter_user_id || raw.broadcaster_user_id) {
    return {
      time: Date.now(),
      nick: raw.chatter_user_login,
      userId: raw.chatter_user_id,
      displayName: raw.chatter_user_name ?? raw.chatter_user_login,
      displayColor: raw.color || "",
      badges: (raw.badges || []).map((badge) => ({
        type: badge.set_id,
        version: badge.id,
        info: badge.info
      })),
      text: raw.message?.text ?? "",
      isAction: raw.message_type === "action",
      emotes: raw.message?.fragments?.filter((fragment) => fragment.type === "emote") ?? [],
      _raw: raw
    };
  }

  if (raw.authorDetails || raw.snippet) {
    return {
      time: Date.parse(raw.snippet?.publishedAt) || Date.now(),
      nick: raw.authorDetails?.displayName,
      userId: raw.authorDetails?.channelId ?? raw.snippet?.authorChannelId,
      displayName: raw.authorDetails?.displayName,
      displayColor: "",
      badges: [],
      text: raw.snippet?.displayMessage ?? raw.snippet?.textMessageDetails?.messageText ?? "",
      isAction: false,
      emotes: [],
      _raw: raw
    };
  }

  if (raw.sender || raw.content) {
    return {
      time: Date.now(),
      nick: raw.sender?.username,
      userId: raw.sender?.user_id,
      displayName: raw.sender?.username,
      displayColor: "",
      badges: [],
      text: raw.content ?? "",
      isAction: false,
      emotes: raw.emotes ?? [],
      _raw: raw
    };
  }

  return raw;
}

/** Convertit les sujets Astro connus en evenements du simulateur. */
export function astroToLabEvents(message, currentSession = {}) {
  if (!message || message.type !== "message") return [];

  if (message.topic === "channel.activities") {
    const widgetEvent = activityToWidgetEvent(message.data);
    return widgetEvent
      ? [{ type: "onEventReceived", detail: widgetEvent }]
      : [];
  }

  if (message.topic === "channel.chat.message") {
    return [{
      type: "onEventReceived",
      detail: { listener: "message", event: { data: chatMessageToWidgetData(message.data) } }
    }];
  }

  if (message.topic === "channel.session.update") {
    const update = message.data ?? {};
    const key = update.key ?? update.name;
    if (!key) return [];
    const session = { ...currentSession, [key]: update.data };
    return [{ type: "onSessionUpdate", detail: { session }, session }];
  }

  if (message.topic === "channel.session.reset") {
    const session = message.data && typeof message.data === "object" ? message.data : {};
    return [{ type: "onSessionUpdate", detail: { session }, session }];
  }

  if (message.topic === "channel.kvstore.update") {
    return [{
      type: "onEventReceived",
      detail: { listener: "kvstore:update", event: { data: message.data } }
    }];
  }

  if (message.topic === "channel.overlay.broadcast") {
    return [{
      type: "onEventReceived",
      detail: {
        listener: message.data?.event ?? "event",
        event: message.data?.data ?? message.data
      }
    }];
  }

  return [];
}

export function parseEnv(source) {
  const values = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}
