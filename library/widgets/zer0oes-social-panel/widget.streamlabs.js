document.addEventListener("onLoad", (obj) => {
  console.log("Widget charge", obj.detail.fieldData);
});

document.addEventListener("onEventReceived", (obj) => {
  console.log("Evenement recu", obj.detail);
});
