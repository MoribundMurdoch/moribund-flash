// src/screens/study/engines/multiple-choice.js
import { escapeHtml } from "../../../utils.js"; // Assuming you have a utils file, or we can keep the helper inside.

export const MultipleChoiceEngine = {
  id: "multiple-choice",
  name: "Multiple Choice",

  /**
   * Generates the UI for the card and the answer interaction area.
   */
  render(card, state, settings, options) {
    const showTermFirst = settings?.showTermFirst ?? false;
    const promptLabel = showTermFirst ? "Term" : "Definition";
    const promptValue = showTermFirst ? (card.term || "No term") : (card.definition || "No definition");

    return `
      <article class="study-card">
        <p class="study-card__label">${promptLabel}</p>
        <h2>${escapeHtml(promptValue)}</h2>

        ${card.exampleSentences.length ? `
          <div class="study-examples">
            <p>Examples</p>
            <ul>
              ${card.exampleSentences.map(ex => `<li>${escapeHtml(ex)}</li>`).join("")}
            </ul>
          </div>
        ` : ""}
      </article>

      <p class="study-answer-prompt">Choose an answer:</p>

      <div class="study-answer-grid">
        ${options.map((opt, i) => {
          // If term-first, we are guessing the definition. Otherwise, guessing the term.
          const optValue = showTermFirst ? opt.definition : opt.term;
          return `
            <button class="study-answer-button ${this.getButtonClass(optValue, state)}" 
                    type="button" data-answer="${escapeHtml(optValue)}" 
                    ${state.locked ? "disabled" : ""}>
              <span class="button-eyebrow">${i + 1}</span>
              <span class="button-main">${escapeHtml(optValue || "Untitled")}</span>
            </button>
          `;
        }).join("")}
      </div>
    `;
  },

  /**
   * Logic to check if the user's choice is correct.
   */
  check(choice, card, settings) {
    const correctAnswer = settings?.showTermFirst ? card.definition : card.term;
    return choice === correctAnswer;
  },

  /**
   * Helper for button styling based on state.
   */
  getButtonClass(term, state) {
    if (!state.locked) return "";
    if (term === state.correctTerm) return "is-correct";
    if (term === state.wrongTerm) return "is-wrong";
    return "";
  }
};
