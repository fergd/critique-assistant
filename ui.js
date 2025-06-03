alert("✅ ui.js loaded!");

window.onmessage = (event) => {
  alert("📩 UI received a message!");

  const data = event.data.pluginMessage;
  document.getElementById("output").textContent = JSON.stringify(data, null, 2);
};
