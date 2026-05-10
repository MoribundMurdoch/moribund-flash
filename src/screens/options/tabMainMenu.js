import { playSound } from "../../sound.js";

export function getMainMenuHTML(state) {
  const s = state.mainMenu || { showCritter: true, critterAnimSpeed: 1.0, emphasizeHover: true, showTipText: true };
  
  return `
    <fieldset class="settings-group">
      <legend>Critter</legend>
      
      <label class="setting-row">
        <input type="checkbox" id="opt-show-critter" ${s.showCritter ? "checked" : ""}>
        <span>Show menu critter</span>
      </label>

      <label class="setting-row" style="${!s.showCritter ? 'opacity: 0.5; pointer-events: none;' : ''}" id="critter-speed-row">
        <span>Animation Speed</span>
        <input type="range" id="opt-critter-speed" min="0.25" max="2.0" step="0.05" value="${s.critterAnimSpeed}">
      </label>
    </fieldset>

    <fieldset class="settings-group">
      <legend>Behavior & Layout</legend>

      <label class="setting-row">
        <input type="checkbox" id="opt-emphasize" ${s.emphasizeHover ? "checked" : ""}>
        <span>Emphasize hovered buttons</span>
      </label>
      
      <label class="setting-row">
        <input type="checkbox" id="opt-tip-text" ${s.showTipText ? "checked" : ""}>
        <span>Show tip text</span>
      </label>
    </fieldset>
  `;
}

export function attachMainMenuListeners(app, state, saveOptions) {
  state.mainMenu = state.mainMenu || {};

  const critterToggle = app.querySelector("#opt-show-critter");
  const speedSlider = app.querySelector("#opt-critter-speed");
  const speedRow = app.querySelector("#critter-speed-row");
  const emphasizeToggle = app.querySelector("#opt-emphasize");
  const tipToggle = app.querySelector("#opt-tip-text");

  critterToggle.addEventListener("change", (e) => {
    state.mainMenu.showCritter = e.target.checked;
    saveOptions(state);
    playSound("ui_select");
    
    // Visually disable the speed slider if critter is toggled off
    if (state.mainMenu.showCritter) {
      speedRow.style.opacity = "1";
      speedRow.style.pointerEvents = "auto";
    } else {
      speedRow.style.opacity = "0.5";
      speedRow.style.pointerEvents = "none";
    }
  });

  speedSlider.addEventListener("change", (e) => {
    state.mainMenu.critterAnimSpeed = parseFloat(e.target.value);
    saveOptions(state);
    playSound("ui_select");
  });

  emphasizeToggle.addEventListener("change", (e) => {
    state.mainMenu.emphasizeHover = e.target.checked;
    saveOptions(state);
    playSound("ui_select");
  });
  
  tipToggle.addEventListener("change", (e) => {
    state.mainMenu.showTipText = e.target.checked;
    saveOptions(state);
    playSound("ui_select");
  });
}