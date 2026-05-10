import { playSound } from "../../sound.js";

export function getStudyHTML(state) {
  const s = state.study || { showTermFirst: true, centerCard: true };
  
  return `
    <fieldset class="settings-group">
      <legend>Card Layout</legend>
      
      <label class="setting-row">
        <input type="checkbox" id="opt-term-first" ${s.showTermFirst ? "checked" : ""}>
        <span>Show term first (Term → Definition)</span>
      </label>

      <label class="setting-row">
        <input type="checkbox" id="opt-center-card" ${s.centerCard ? "checked" : ""}>
        <span>Keep card centered</span>
      </label>
    </fieldset>
    
    <fieldset class="settings-group">
      <legend>Under Construction</legend>
      <p style="padding: 0 16px; color: #888;">Custom fonts, custom colors, and progress bar configurations will live here once the study engine is fully connected.</p>
    </fieldset>
  `;
}

export function attachStudyListeners(app, state, saveOptions) {
  state.study = state.study || {};

  const termFirstToggle = app.querySelector("#opt-term-first");
  const centerToggle = app.querySelector("#opt-center-card");

  termFirstToggle.addEventListener("change", (e) => {
    state.study.showTermFirst = e.target.checked;
    saveOptions(state);
    playSound("ui_select");
  });

  centerToggle.addEventListener("change", (e) => {
    state.study.centerCard = e.target.checked;
    saveOptions(state);
    playSound("ui_select");
  });
}