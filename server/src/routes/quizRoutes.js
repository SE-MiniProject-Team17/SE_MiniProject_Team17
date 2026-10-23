const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const ROLES = require('../config/roles');
const { quizRules } = require('../validators/quizValidators');
const { loadOwnQuiz, prepareQuizEdit } = require('../middleware/loadOwnQuiz');
const controller = require('../controllers/quizController');
const studentController = require('../controllers/studentQuizController');
const { param } = require('express-validator');

const router = express.Router();

router.use(authenticate);

const faculty = requireRole(ROLES.FACULTY);
const student = requireRole(ROLES.STUDENT);

// Student quiz listing and attempt loading
router.get('/', student, studentController.list);
router.get(
  '/:quizId/attempt',
  student,
  param('quizId').isMongoId().withMessage('Quiz ID must be valid'),
  validate,
  studentController.getForAttempt
);

// Faculty quiz authoring
router.post('/', faculty, quizRules, validate, controller.create);
router.get('/mine', faculty, controller.listMine);
router.get('/:id', faculty, loadOwnQuiz, controller.getOne);
router.put('/:id', faculty, loadOwnQuiz, prepareQuizEdit, quizRules, validate, controller.update);
router.post('/:id/publish', faculty, loadOwnQuiz, controller.publish);

// #42 – deletion (REQ-QZ-05)
router.delete('/:id', faculty, loadOwnQuiz, controller.remove);

module.exports = router;
