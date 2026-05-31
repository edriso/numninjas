/**
 * Single source of truth for question-content limits. Imported by the
 * audit script and the test suite so they cannot drift apart.
 *
 * Why these numbers:
 *  - OPTION_MAX_CHARS: math answers are short, so they go straight into
 *    the quiz poll's options. Telegram's hard limit per poll option is
 *    100 characters, so that is our cap. (This differs from text-heavy
 *    quiz bots that hide long answers in the message and show A/B/C/D in
 *    the poll. Math answers like "23 pounds" need no such trick.)
 *  - QUESTION_MAX_CHARS: the prompt is shown in the context message, not
 *    the poll, but we still cap it so a single question never dominates
 *    the screen for a young reader.
 *  - EXPLANATION_MAX_CHARS: Telegram's quiz-poll explanation hard limit
 *    (per Bot API). Exceeding it makes sendPoll return 400.
 *  - MESSAGE_BUDGET_CHARS: scenario + prompt + hint + options must stay
 *    under this so the rendered HTML message fits comfortably under
 *    Telegram's 4096-char sendMessage cap.
 */
export const OPTION_MAX_CHARS = 100;
export const QUESTION_MAX_CHARS = 300;
export const EXPLANATION_MAX_CHARS = 200;
export const MESSAGE_BUDGET_CHARS = 2000;
