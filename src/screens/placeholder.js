export function renderPlaceholder(app, { goTo }, { title, body }) {
  app.innerHTML = `
    <main class="placeholder-screen">
      <section class="placeholder-panel">
        <p class="kicker">Moribund Flash</p>
        <h1>${title}</h1>
        <p>${body}</p>

        <button class="menu-button back-button" id="back-to-menu" type="button">
          <span class="button-eyebrow">Return</span>
          <span class="button-main">Back to Main Menu</span>
        </button>
      </section>
    </main>
  `;

  app.querySelector("#back-to-menu").addEventListener("click", () => {
    goTo("mainMenu");
  });
}
