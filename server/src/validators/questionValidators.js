const { body } = require('express-validator');
const { LIMITS, OPTION_LABELS, DIFFICULTIES } = require('../models/Question');

/**
 * Validation rules for a question (REQ-QB-01, REQ-QB-02; STP TC-QB-02..04).
 * Each message names the failing field and the rule, e.g. "Topic must be at most 50 characters".
 * #15 (editing) reuses these same rules.
 */
const requiredText = (field, label, max) =>
  body(field)
    .exists({ values: 'falsy' })
    .withMessage(`${label} is required`)
    .bail()
    .isString()
    .withMessage(`${label} must be text`)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(`${label} is required`)
    .bail()
    .isLength({ max })
    .withMessage(`${label} must be at most ${max} characters`);

const questionRules = [
  requiredText('text', 'Question text', LIMITS.TEXT_MAX),

  body('options')
    .exists()
    .withMessage('Options are required')
    .bail()
    .isArray({ min: LIMITS.OPTION_COUNT, max: LIMITS.OPTION_COUNT })
    .withMessage(`Options must contain exactly ${LIMITS.OPTION_COUNT} answers`)
    .bail()
    .custom((options) => {
      options.forEach((opt, i) => {
        const label = `Option ${OPTION_LABELS[i]}`;
        if (typeof opt !== 'string' || opt.trim() === '') {
          throw new Error(`${label} is required (all ${LIMITS.OPTION_COUNT} options must be filled)`);
        }
        if (opt.trim().length > LIMITS.OPTION_MAX) {
          throw new Error(`${label} must be at most ${LIMITS.OPTION_MAX} characters`);
        }
      });
      const normalised = options.map((o) => o.trim().toLowerCase());
      if (new Set(normalised).size !== normalised.length) {
        throw new Error(`Options must be ${LIMITS.OPTION_COUNT} different answers`);
      }
      return true;
    }),

  body('correctOption')
    .exists({ values: 'falsy' })
    .withMessage('Correct option is required')
    .bail()
    .isIn(OPTION_LABELS)
    .withMessage(`Correct option must be one of ${OPTION_LABELS.join(', ')}`),

  requiredText('topic', 'Topic', LIMITS.TOPIC_MAX),

  body('difficulty')
    .exists({ values: 'falsy' })
    .withMessage('Difficulty is required')
    .bail()
    .isIn(DIFFICULTIES)
    .withMessage(`Difficulty must be one of ${DIFFICULTIES.join(', ')}`),

  body('explanation')
    .optional({ values: 'null' })
    .isString()
    .withMessage('Explanation must be text')
    .bail()
    .trim()
    .isLength({ max: LIMITS.EXPLANATION_MAX })
    .withMessage(`Explanation must be at most ${LIMITS.EXPLANATION_MAX} characters`),
];

module.exports = { questionRules };
