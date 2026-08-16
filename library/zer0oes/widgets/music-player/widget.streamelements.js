window.addEventListener("onWidgetLoad", (obj) => {
  console.log("Widget charge", obj.detail.fieldData);
});

window.addEventListener("onEventReceived", (obj) => {
  console.log("Evenement recu", obj.detail.listener, obj.detail.event);
});
