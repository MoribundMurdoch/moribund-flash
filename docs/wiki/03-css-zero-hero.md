# CSS Zero to Hero

CSS is the appearance layer of the app.

In Moribund Flash, CSS answers the question:

> What does the interface look like?

HTML creates the structure.

JavaScript creates behavior.

CSS makes the thing look less like a tax form abandoned in a basement.

## What CSS does in this project

The main stylesheet is:

```text
src/styles.css
This file controls the global visual language:

black backgrounds
white text
purple focus and hover states
screen layouts
buttons
menus
options panels
study cards
Core CSS idea

CSS selects HTML elements and applies rules.

Example:

body {
  background: #000000;
  color: #ffffff;
}

This means:

Make the page background black and the text white.

Selectors

A selector chooses what to style.

Element selector
button {
  font: inherit;
}

Styles every <button>.

Class selector
.menu-button {
  border: 1px solid #ffffff;
}

Styles every element with:

class="menu-button"
ID selector
#app {
  min-height: 100vh;
}

Styles the one element with:

id="app"
The Moribund Flash color rules

The core theme is intentionally strict:

background: #000000;
color: #ffffff;

Purple Ink is reserved for interactive states:

:focus
:hover

Accent color:

#a912e6

The idea:

black and white are the default
purple means “you are touching this”
no decorative rainbow soup
Example button style
.menu-button {
  background: #000000;
  color: #ffffff;
  border: 1px solid #ffffff;
  padding: 0.75rem 1rem;
  cursor: pointer;
}

.menu-button:hover,
.menu-button:focus {
  border-color: #a912e6;
  color: #a912e6;
  outline: none;
}

This matches the app philosophy:

readable by default
obvious when focused
no gradients doing interpretive dance
Layout basics

CSS layout controls where things go.

Common tools:

display: flex;
display: grid;
gap: 1rem;
padding: 1rem;
margin: 0;
Flexbox

Good for one-dimensional layout:

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
Grid

Good for two-dimensional layout:

.options-layout {
  display: grid;
  grid-template-columns: 16rem 1fr;
  gap: 1rem;
}
Fonts

Moribund Flash uses local font files from:

src/assets/fonts/

Fonts are loaded in CSS with @font-face.

Example pattern:

@font-face {
  font-family: "IM Fell English";
  src: url("./assets/fonts/IMFellEnglish-Regular.ttf") format("truetype");
}

Then used like:

body {
  font-family: "IM Fell English", serif;
}
Important rule for this project

Do not import CSS from JavaScript.

Bad:

import "./styles.css";

Good:

<link rel="stylesheet" href="./styles.css">

Why?

Because this project has no frontend bundler. The browser does not magically know how to treat CSS as a JavaScript module. It will complain about MIME types, because the browser is not your unpaid intern.

Moribund Flash CSS philosophy

Keep styles:

readable
centralized
boring where possible
dramatic only where useful
black, white, and Purple Ink

A style is good when you can still understand it two weeks later without summoning a frontend archaeologist.

Things to learn next
How src/styles.css defines the global theme
How screen modules use CSS classes
How focus and hover states work
How layout changes between main menu, options, deck list, and study screens
How local fonts are loaded