// src/optionsState.js

const defaultOptions = {
  global: {
    soundEnabled: true,
    masterVolume: 1.0,
    uiScale: 1.0,
    debugEnabled: false,
  },
  mainMenu: {
    showCritter: true,
    critterAnimSpeed: 1.0,
    emphasizeHover: true,
    showTipText: true,
  },
  study: {
    showTermFirst: true,
    centerCard: true,
  },
  builder: {
    autosaveEnabled: true,
    warnOnExit: true,
    newCardMode: "blank",
    showAdvanced: false,
  }
};

export function loadOptions() {
  const stored = localStorage.getItem("morflash_options");
  if (stored) {
    try {
      return { ...defaultOptions, ...JSON.parse(stored) };
    } catch (e) {
      console.error("Failed to parse options", e);
    }
  }
  return JSON.parse(JSON.stringify(defaultOptions));
}

export function saveOptions(currentOptions) {
  localStorage.setItem("morflash_options", JSON.stringify(currentOptions));
}
