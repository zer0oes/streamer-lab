// Simulation locale d'une AlertBox StreamElements avec « custom CSS ».
//
// Ce fichier n'est PAS un module : il est injecté tel quel (import ?raw)
// dans le document de l'aperçu (cf. widgetSrcdoc.ts) et évalué de la même
// façon par les tests (alertboxRuntime.test.ts). Il ne doit donc contenir ni
// import/export, ni la séquence de fermeture de balise script.
//
// Comme l'AlertBox native : chaque alerte (et chaque variation de la
// Subscriber alert : resub, sub offert, community gift) a SON code, affiché
// dans une iframe NEUVE où les variables ({{name}}, {{amount}},
// {{widgetDuration}}…) sont remplacées ; le son et la durée viennent des
// réglages de l'alerte (alertbox.json), et les alertes s'enchaînent en file
// d'attente.
// Doc : https://docs.streamelements.com/overlays/custom-code-in-alertbox
var AlertboxRuntime = (function () {
  "use strict";

  var ALERT_TYPES = ["follow", "sub", "resub", "gift", "community", "cheer", "tip", "raid", "purchase", "charity"];
  var DEFAULT_SETTINGS = { enabled: true, sound: "", volume: 0.5, duration: 8 };
  // Courte pause entre deux alertes, comme l'AlertBox
  var ALERT_GAP_MS = 500;
  var DEDUPE_MS = 4000;

  function normalizeConfig(raw) {
    var alerts = (raw && raw.alerts) || {};
    var result = {};
    ALERT_TYPES.forEach(function (type) {
      var settings = alerts[type] || {};
      var volume = Number(settings.volume);
      var duration = Number(settings.duration);
      result[type] = {
        enabled: settings.enabled !== false,
        sound: typeof settings.sound === "string" ? settings.sound.trim() : "",
        volume: settings.volume != null && isFinite(volume) ? Math.min(1, Math.max(0, volume)) : DEFAULT_SETTINGS.volume,
        duration: isFinite(duration) && duration > 0 ? Math.min(90, duration) : DEFAULT_SETTINGS.duration
      };
    });
    return { alerts: result };
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ------------------------------------
  // Type d'alerte (formats StreamElements et Streamlabs du labo)
  // ------------------------------------
  function subTypeOf(ev) {
    var data = (ev && ev.data) || {};
    return String((ev && (ev.sub_type || ev.subType)) || data.sub_type || "").toLowerCase();
  }

  function isGiftEvent(ev) {
    var data = (ev && ev.data) || {};
    return Boolean(ev.gifted || ev.bulkGifted || data.gifted || data.bulkGifted || ev.gifter || data.gifter || subTypeOf(ev).indexOf("gift") !== -1);
  }

  function isBulkGift(ev) {
    var data = (ev && ev.data) || {};
    return Boolean(ev.bulkGifted || data.bulkGifted || subTypeOf(ev).indexOf("community") !== -1);
  }

  // Lors d'un community gift, StreamElements envoie l'évènement groupé PUIS
  // un évènement par destinataire : l'AlertBox n'affiche que le groupé.
  function isCommunityGiftRecipient(ev) {
    return Boolean(ev.isCommunityGift || (ev.data && ev.data.isCommunityGift));
  }

  function detectAlertType(listener, ev) {
    if (!ev) return null;
    var key = String(listener || "").toLowerCase() + " " + String(ev.type || "").toLowerCase();

    if (key.indexOf("follow") !== -1) return "follow";
    // Avant « tip » : un don caritatif (charityCampaignDonation) contient « donation »
    if (key.indexOf("charity") !== -1) return "charity";
    if (key.indexOf("purchase") !== -1 || key.indexOf("merch") !== -1) return "purchase";
    if (key.indexOf("tip") !== -1 || key.indexOf("donation") !== -1) return "tip";
    if (key.indexOf("cheer") !== -1 || key.indexOf("bit") !== -1) return "cheer";
    if (key.indexOf("raid") !== -1) return "raid";
    if (key.indexOf("sub") !== -1) {
      // Comme la variation « Resub » : amount = mois cumulés
      if (!isGiftEvent(ev)) return Number(ev.amount != null ? ev.amount : ev.data && ev.data.amount) > 1 ? "resub" : "sub";
      if (isCommunityGiftRecipient(ev)) return null;
      return isBulkGift(ev) ? "community" : "gift";
    }
    return null;
  }

  // ------------------------------------
  // Variables AlertBox
  // ------------------------------------
  function buildAlertVariables(type, ev, settings, currency) {
    var data = (ev && ev.data) || {};
    var name = ev.name || ev.from || data.displayName || data.username || "Anonyme";
    var sender = ev.sender || data.sender || ev.gifter || data.gifter || "";
    var amount = Number(ev.amount != null ? ev.amount : data.amount) || 0;
    if (type === "raid") amount = Number(ev.viewers != null ? ev.viewers : amount) || 0;
    if (type === "sub" || type === "resub" || type === "community") amount = Math.max(1, Math.round(amount));
    if (type === "gift") amount = 1;
    if (type === "community") name = sender || name;

    // Achat : liste des articles (« 2× Mug, T-shirt »), comme {{items}}
    var items = (ev.items || data.items || [])
      .map(function (item) {
        var quantity = Number(item && item.quantity) || 1;
        return (quantity > 1 ? quantity + "× " : "") + String((item && item.name) || "");
      })
      .filter(function (label) { return label.trim(); })
      .join(", ");

    var messageRaw = String(ev.message != null ? ev.message : data.message != null ? data.message : data.text || "");
    var message = escapeHtml(messageRaw);
    var symbol = (currency && currency.symbol) || "€";

    return {
      name: escapeHtml(name),
      sender: escapeHtml(sender),
      amount: String(amount),
      count: String(amount),
      months: String(amount),
      tier: escapeHtml(ev.tier || data.tier || ""),
      currency: escapeHtml(symbol),
      message: message,
      userMessage: message,
      messageRaw: message,
      announcement: "",
      messageTemplate: "",
      items: escapeHtml(items),
      image: "",
      video: "",
      videoVolume: "0",
      audio: escapeHtml(settings.sound),
      audioVolume: String(settings.volume),
      widgetDuration: String(settings.duration)
    };
  }

  // {{variable}} et {variable} sont équivalents dans l'AlertBox
  function substituteAlertVariables(source, vars) {
    return String(source).replace(/\{\{\s*(\w+)\s*\}\}|\{(\w+)\}/g, function (match, doubleName, singleName) {
      var key = doubleName || singleName;
      return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match;
    });
  }

  function scriptJson(value) {
    return JSON.stringify(value).replace(/</g, "\\u003c");
  }

  // Document d'UNE alerte : code du widget avec variables remplacées, console
  // relayée vers l'hôte, puis onWidgetLoad (fieldData + alert_type).
  function buildAlertDocument(code, vars, loadDetail) {
    var html = substituteAlertVariables(code.html || "", vars);
    var css = substituteAlertVariables(code.css || "", vars);
    var js = substituteAlertVariables(code.js || "", vars);
    var closeScript = "</" + "script>";

    return (
      '<!doctype html><html><head><meta charset="utf-8"><style>html,body{background:transparent!important}' +
      css +
      "</style></head><body>" +
      html +
      "<script>(function(){" +
      'var send=function(level,args){parent.postMessage({source:"se-widget",kind:"console",level:level,args:args},"*")};' +
      '["log","info","warn","error"].forEach(function(level){var original=console[level].bind(console);' +
      "console[level]=function(){var args=[].slice.call(arguments).map(function(v){if(typeof v===\"string\")return v;try{return JSON.stringify(v)}catch(e){return String(v)}});send(level,args);original.apply(null,arguments)}});" +
      'window.addEventListener("error",function(e){send("error",[e.message])});' +
      "try{(new Function(" +
      scriptJson(js) +
      "))()}catch(e){console.error(e.stack||e.message)}" +
      'window.dispatchEvent(new CustomEvent("onWidgetLoad",{detail:' +
      scriptJson(loadDetail) +
      "}));" +
      "})();" +
      closeScript +
      "</body></html>"
    );
  }

  // ------------------------------------
  // Hôte : file d'attente, une iframe par alerte, son natif
  // ------------------------------------
  function createHost(options) {
    var config = normalizeConfig(options.config);
    var stage = options.stage;
    var win = options.window || window;
    var log = options.log || function (level, message) { console[level](message); };
    var playSound =
      options.playSound ||
      function (settings) {
        if (!settings.sound) return;
        var audio = new Audio(settings.sound);
        audio.volume = settings.volume;
        audio.play().catch(function (error) {
          log("warn", "AlertBox : lecture du son impossible (" + (error && error.message) + ")");
        });
      };

    var queue = [];
    var showing = false;
    var loadDetail = { fieldData: {} };
    var seen = {};

    function isDuplicate(listener, ev) {
      var now = Date.now();
      Object.keys(seen).forEach(function (key) {
        if (now - seen[key] > DEDUPE_MS) delete seen[key];
      });
      var id = ev.id != null ? ev.id : ev._id != null ? ev._id : ev.data && ev.data.id;
      if (id == null) return false;
      var key = listener + "|" + id;
      if (seen[key]) return true;
      seen[key] = now;
      return false;
    }

    function next() {
      var item = queue.shift();
      if (!item) {
        showing = false;
        return;
      }
      showing = true;

      var settings = config.alerts[item.type];
      var code = (options.codes || {})[item.type];
      if (!code || !(code.html || code.js)) {
        log("warn", "AlertBox · aucun code pour l'alerte « " + item.type + " »");
        win.setTimeout(next, 0);
        return;
      }
      var vars = buildAlertVariables(item.type, item.event, settings, loadDetail.currency);
      // Valeurs des champs propres à CETTE alerte, comme dans l'AlertBox
      var detail = {};
      Object.keys(loadDetail).forEach(function (key) {
        detail[key] = loadDetail[key];
      });
      detail.fieldData = code.fieldData || {};

      var frame = win.document.createElement("iframe");
      frame.className = "alertbox-frame";
      frame.setAttribute("sandbox", "allow-scripts");
      frame.setAttribute("data-alert-type", item.type);
      frame.srcdoc = buildAlertDocument(code, vars, detail);
      stage.appendChild(frame);
      playSound(settings, item.type);
      log("info", "AlertBox · " + item.type + " · " + settings.duration + " s");

      win.setTimeout(function () {
        frame.remove();
        win.setTimeout(next, ALERT_GAP_MS);
      }, settings.duration * 1000);
    }

    function handleEvent(detail) {
      var listener = String((detail && detail.listener) || "").toLowerCase();
      var ev = detail && detail.event;
      if (!ev) return;
      var type = detectAlertType(listener, ev);
      if (!type) return;
      if (!config.alerts[type].enabled) {
        log("info", "AlertBox · alerte « " + type + " » désactivée, ignorée");
        return;
      }
      if (isDuplicate(listener, ev)) return;
      queue.push({ type: type, event: ev });
      if (!showing) next();
    }

    win.addEventListener("onWidgetLoad", function (event) {
      loadDetail = (event && event.detail) || { fieldData: {} };
    });
    win.addEventListener("onEventReceived", function (event) {
      handleEvent(event && event.detail);
    });
    // Relaye vers le labo la console des iframes d'alerte
    win.addEventListener("message", function (event) {
      var data = event.data;
      if (data && data.source === "se-widget" && event.source !== win && win.parent !== win) win.parent.postMessage(data, "*");
    });

    return { handleEvent: handleEvent, config: config };
  }

  return {
    ALERT_TYPES: ALERT_TYPES,
    normalizeConfig: normalizeConfig,
    escapeHtml: escapeHtml,
    detectAlertType: detectAlertType,
    buildAlertVariables: buildAlertVariables,
    substituteAlertVariables: substituteAlertVariables,
    buildAlertDocument: buildAlertDocument,
    createHost: createHost
  };
})();
