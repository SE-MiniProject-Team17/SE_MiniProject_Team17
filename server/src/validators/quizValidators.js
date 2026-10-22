const mongoose = require('mongoose');
const { body } = require('express-validator');
const { LIMITS } = require('../models/Quiz');

/**
 * Quiz rules (REQ-QZ-01, REQ-QZ-02; STP TC-QZ-02, TC-QZ-03).
 * Every message names the failing field and the rule. Used for create and (after merging the
 * current values with the changes) for editing a Draft, so both follow the same rules.
 */
const quizRules = [
  body('title')
    .exists({ values: 'falsy' })
    .withMessage('Title is required')
    .bail()
    .isString()
    .withMessage('Title must be text')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .bail()
    .isLength({ max: LIMITS.TITLE_MAX })
    .withMessage(`Title must be at most ${LIMITS.TITLE_MAX} characters`),

  body('description')
    .optional({ values: 'null' })
    .isString()
    .withMessage('Description must be text')
    .bail()
    .trim()
    .isLength({ max: LIMITS.DESCRIPTION_MAX })
    .withMessage(`Description must be at most ${LIMITS.DESCRIPTION_MAX} characters`),

  body('timeLimitMinutes')
    .exists({ values: 'null' })
    .withMessage('Time limit is required')
    .bail()
    .isInt({ min: LIMITS.TIME_MIN, max: LIMITS.TIME_MAX })
    .withMessage(`Time limit must be a whole number between ${LIMITS.TIME_MIN} and ${LIMITS.TIME_MAX} minutes`)
    .toInt(),

  body('availableFrom')
    .exists({ values: 'falsy' })
    .withMessage('Availability start is required')
    .bail()
    .isISO8601()
    .withMessage('Availability start must be a valid date and time'),

  body('availableUntil')
    .exists({ values: 'falsy' })
    .withMessage('Availability end is required')
    .bail()
    .isISO8601()
    .withMessage('Availability end must be a valid date and time')
    .bail()
    .custom((until, { req }) => {
      const from = new Date(req.body.availableFrom);
      if (Number.isNaN(from.getTime())) return true; // start is reported by its own rule
      if (new Date(until) <= from) throw new Error('Availability end must be later than the availability start');
      return true;
    }),

  body('questionIds')
    .exists()
    .withMessage('Select at least 1 question')
    .bail()
    .isArray({ min: LIMITS.QUESTIONS_MIN, max: LIMITS.QUESTIONS_MAX })
    .withMessage(`Select between ${LIMITS.QUESTIONS_MIN} and ${LIMITS.QUESTIONS_MAX} questions`)
    .bail()
    .custom((ids) => {
      if (!ids.every((id) => typeof id === 'string' && mongoose.isValidObjectId(id))) {
        throw new Error('Selected questions are not valid');
      }
      if (new Set(ids).size !== ids.length) throw new Error('The same question cannot be selected twice');
      return true;
    }),
];

module.exports = { quizRules };
