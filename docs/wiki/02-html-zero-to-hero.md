# HTML Zero to Hero

HTML is the structure of the app.

In Moribund Flash, HTML answers the question:

> What exists on the screen?

CSS answers:

> What does it look like?

JavaScript answers:

> What happens when the user pokes it?

## What HTML does in this project

The app starts from:

```text
src/index.html
That file is the shell. It loads the stylesheet and the JavaScript router.

Most screens are not written as separate .html files. Instead, screen modules create HTML strings and inject them into the main app container.

Example idea:

app.innerHTML = `
  <section class="screen">
    <h1>Deck List</h1>
    <button>Study</button>
  </section>
`;

This is still HTML. It is just being created by JavaScript.

Core HTML concepts
Elements

An element is a piece of the page:

h1
button
section
main
div

Example:

<h1>Moribund Flash</h1>
Attributes

Attributes add extra information:

<button type="button" class="menu-button">
  Start Study
</button>

Here:

type="button" tells the browser this is a normal button.
class="menu-button" gives CSS and JavaScript a hook.
IDs

An id should usually be unique on the page:

<main id="app"></main>

The router can find it:

const app = document.querySelector("#app");
Classes

Classes are reusable labels:

<button class="menu-button">Options</button>
<button class="menu-button">Quit</button>

CSS can style all of them:

.menu-button {
  color: white;
}
HTML in a Tauri app

Tauri uses a webview. That means the frontend is basically a small local website inside a desktop app.

So this project still uses normal browser rules:

index.html loads first.
CSS is linked with <link>.
JavaScript modules are loaded with <script type="module">.
Relative paths matter.
Important rule for this project

Because Moribund Flash uses native ES modules and no bundler, paths must be boring and explicit.

Good:

<script type="module" src="./main.js"></script>

Bad:

<script type="module" src="main.js"></script>

Also bad:

import "./styles.css";

CSS belongs in HTML:

<link rel="stylesheet" href="./styles.css">
Moribund Flash HTML philosophy

Use semantic HTML when it is obvious.

Good:

<main id="app"></main>
<section class="screen"></section>
<button type="button">Study</button>

Less good:

<div onclick="doThing()">Study</div>

A button should be a button. Revolutionary stuff. Alert the academy.

Things to learn next
How src/index.html boots the app
How main.js finds the app container
How screen modules inject HTML
How buttons get event listeners
How CSS classes connect structure to style
