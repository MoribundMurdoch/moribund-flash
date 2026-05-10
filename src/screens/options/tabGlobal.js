import { setEnabled, setVolume, playSound } from "../../sound.js";

export function getGlobalHTML(state) {
  // Defensive fallback in case the state section hasn't initialized yet
  const s = state.global || { soundEnabled: true, masterVolume: 1.0, debugEnabled: false };
  
  return `
    <fieldset class="settings-group">
      <legend>Audio</legend>
      
      <label class="setting-row">
        <input type="checkbox" id="opt-sound-enabled" ${s.soundEnabled ? "checked" : ""}>
        <span>Enable sound effects</span>
      </label>

      <label class="setting-row">
        <span>Master Volume</span>
        <input type="range" id="opt-master-volume" min="0" max="1" step="0.05" value="${s.masterVolume}">
      </label>
    </fieldset>

    <fieldset class="settings-group">
      <legend>Interface</legend>

      <label class="setting-row">
        <input type="checkbox" id="opt-debug" ${s.debugEnabled ? "checked" : ""}>
        <span>Enable debug overlay</span>
      </label>
    </fieldset>
  `;
}

export function attachGlobalListeners(app, state, saveOptions) {
  state.global = state.global || {};

  const soundToggle = app.querySelector("#opt-sound-enabled");
  const volumeSlider = app.querySelector("#opt-master-volume");
  const debugToggle = app.querySelector("#opt-debug");

  soundToggle.addEventListener("change", (e) => {
    state.global.soundEnabled = e.target.checked;
    saveOptions(state);
    setEnabled(state.global.soundEnabled);
    playSound("ui_select");
  });

  volumeSlider.addEventListener("input", (e) => {
    state.global.masterVolume = parseFloat(e.target.value);
    saveOptions(state);
    setVolume(state.global.masterVolume);
  });

  volumeSlider.addEventListener("change", () => {
    playSound("ui_select");
  });

  debugToggle.addEventListener("change", (e) => {
    state.global.debugEnabled = e.target.checked;
    saveOptions(state);
    playSound("ui_select");
  });
}