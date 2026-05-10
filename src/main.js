import { renderMainMenu } from "./screens/mainMenu.js";
import { renderPlaceholder } from "./screens/placeholder.js";
import { renderOptions } from "./screens/options/index.js";
import { renderDeckList } from "./screens/deckList.js";
import { loadSound } from "./sound.js";

// Load the sounds into memory right as the app starts
loadSound("ui_select", "./assets/sfx/ui_select.ogg");
loadSound("correct", "./assets/sfx/Correct-Tone-Default.ogg");
loadSound("wrong", "./assets/sfx/Incorrect-Sound-Default.ogg");
loadSound("finish", "./assets/sfx/Celebration-Noise-Default.ogg");

const app = document.querySelector("#app");

const screens = {
  mainMenu: renderMainMenu,
  options: renderOptions,
  deckList: renderDeckList,

  deckBuilder: (app, context) =>
    renderPlaceholder(app, context, {
      title: "Deck Builder",
      body: "A simple deck creation screen will live here.",
    }),

  controls: (app, context) =>
    renderPlaceholder(app, context, {
      title: "Controls",
      body: "Keyboard and mouse controls will live here.",
    }),
};

export function goTo(screenName, data = {}) {
  const render = screens[screenName];

  if (!render) {
    console.error(`Unknown screen: ${screenName}`);
    return;
  }

  render(app, { goTo, data });
}

goTo("mainMenu");