const express = require('express');
const { param, body } = require('express-validator');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const ROLES = require('../config/roles');
const attemptController = require('../controllers/attemptController');

const router = express.Router();

router.post(
  '/:quizId/submit',
  authenticate,
  requireRole(ROLES.STUDENT),
  param('quizId').isMongoId().withMessage('Quiz ID must be valid'),
  body('answers').isArray().withMessage('Answers must be an array'),
  validate,
  attemptController.submit
);

router.get(
  '/:attemptId/result',
  authenticate,
  requireRole(ROLES.STUDENT),
  param('attemptId').isMongoId().withMessage('Attempt ID must be valid'),
  validate,
  attemptController.result
);

router.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = router;