const { body } = require('express-validator');

const groupCreationRules = [
  body('name')
    .exists()
    .withMessage('Group name is required')
    .bail()
    .isString()
    .withMessage('Group name must be text')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Group name is required'),

  body('description')
    .optional({ values: 'null' })
    .isString()
    .withMessage('Group description must be text')
    .bail()
    .trim(),
];

module.exports = { groupCreationRules };