// src/screens/settings/tabStudy.js
import { playSound } from "../../sound.js";

export function getStudyHTML(state) {
  // Ensure we have defaults if state.study is empty
  const s = state.study || {};
  const mode = s.mode || "multiple-choice";
  const showTermFirst = s.showTermFirst ?? false;
  const centerCard = s.centerCard ?? true;
  
  return `
    <fieldset class="settings-group">
      <legend>Study Engine</legend>
      <p class="settings-help">Choose how you want to interact with your cards.</p>
      <label class="setting-row">
        <span>Mode</span>
        <select id="opt-study-mode">
          <option value="multiple-choice" ${mode === 'multiple-choice' ? 'selected' : ''}>Multiple Choice</option>
          <option value="flashcard-flip" ${mode === 'flashcard-flip' ? 'selected' : ''}>Classic Flip (Beta)</option>
          <option value="type-answer" ${mode === 'type-answer' ? 'selected' : ''}>Writing Practice</option>
        </select>
      </label>
    </fieldset>

    <fieldset class="settings-group">
      <legend>Card Layout</legend>
      
      <label class="setting-row">
        <input type="checkbox" id="opt-term-first" ${showTermFirst ? "checked" : ""}>
        <span>Show term first (Term → Definition)</span>
      </label>

      <label class="setting-row">
        <input type="checkbox" id="opt-center-card" ${centerCard ? "checked" : ""}>
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

  const modeSelect = app.querySelector("#opt-study-mode");
  const termFirstToggle = app.querySelector("#opt-term-first");
  const centerToggle = app.querySelector("#opt-center-card");

  modeSelect.addEventListener("change", (e) => {
    state.study.mode = e.target.value;
    saveOptions(state);
    playSound("ui_select");
  });

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