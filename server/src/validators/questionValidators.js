const { body, query } = require('express-validator');
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


/**
 * #14 – query parameters for GET /api/questions (REQ-QB-04).
 *   q          keyword in the question text (optional, ≤ 100 chars)
 *   topic      exact topic, case-insensitive (optional, ≤ 50 chars)
 *   difficulty Easy | Medium | Hard (optional)
 *   page/limit paging (defaults 1 and 20, limit ≤ 100)
 */
const searchRules = [
  query('q')
    .optional()
    .isString()
    .withMessage('Keyword must be text')
    .bail()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Keyword must be at most 100 characters'),
  query('topic')
    .optional()
    .isString()
    .withMessage('Topic must be text')
    .bail()
    .trim()
    .isLength({ max: LIMITS.TOPIC_MAX })
    .withMessage(`Topic must be at most ${LIMITS.TOPIC_MAX} characters`),
  query('difficulty')
    .optional({ values: 'falsy' })
    .isIn(DIFFICULTIES)
    .withMessage(`Difficulty must be one of ${DIFFICULTIES.join(', ')}`),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a whole number of 1 or more').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100').toInt(),
];

module.exports = { questionRules, searchRules };
