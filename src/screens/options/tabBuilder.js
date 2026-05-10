import { playSound } from "../../sound.js";

export function getBuilderHTML(state) {
  const s = state.builder || { autosaveEnabled: true, warnOnExit: true, newCardMode: "blank", showAdvanced: false };
  
  return `
    <fieldset class="settings-group">
      <legend>Editor Behavior</legend>
      
      <label class="setting-row">
        <input type="checkbox" id="opt-autosave" ${s.autosaveEnabled ? "checked" : ""}>
        <span>Enable autosave</span>
      </label>

      <label class="setting-row">
        <input type="checkbox" id="opt-warn-exit" ${s.warnOnExit ? "checked" : ""}>
        <span>Warn before closing unsaved decks</span>
      </label>
    </fieldset>

    <fieldset class="settings-group">
      <legend>Card Creation</legend>

      <label class="setting-row" style="flex-direction: column; align-items: flex-start; gap: 8px;">
        <span style="font-size: 0.9em; color: #ccc;">Default new card mode:</span>
        <select id="opt-new-card-mode" style="padding: 8px; background: #000; color: #fff; border: 1px solid #fff; font-family: inherit;">
          <option value="blank" ${s.newCardMode === "blank" ? "selected" : ""}>Start blank</option>
          <option value="clone" ${s.newCardMode === "clone" ? "selected" : ""}>Clone previous card's format</option>
        </select>
      </label>
    </fieldset>

    <fieldset class="settings-group">
      <legend>Advanced Metadata</legend>
      <label class="setting-row">
        <input type="checkbox" id="opt-show-advanced" ${s.showAdvanced ? "checked" : ""}>
        <span>Show advanced fields (Tags, Media Paths)</span>
      </label>
    </fieldset>
  `;
}

export function attachBuilderListeners(app, state, saveOptions) {
  state.builder = state.builder || {};

  const autosaveToggle = app.querySelector("#opt-autosave");
  const warnExitToggle = app.querySelector("#opt-warn-exit");
  const newCardModeSelect = app.querySelector("#opt-new-card-mode");
  const advancedToggle = app.querySelector("#opt-show-advanced");

  autosaveToggle.addEventListener("change", (e) => {
    state.builder.autosaveEnabled = e.target.checked;
    saveOptions(state);
    playSound("ui_select");
  });

  warnExitToggle.addEventListener("change", (e) => {
    state.builder.warnOnExit = e.target.checked;
    saveOptions(state);
    playSound("ui_select");
  });

  newCardModeSelect.addEventListener("change", (e) => {
    state.builder.newCardMode = e.target.value;
    saveOptions(state);
    playSound("ui_select");
  });

  advancedToggle.addEventListener("change", (e) => {
    state.builder.showAdvanced = e.target.checked;
    saveOptions(state);
    playSound("ui_select");
  });
}