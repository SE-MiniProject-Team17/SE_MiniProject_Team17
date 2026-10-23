const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const ROLES = require('../config/roles');
const { quizRules } = require('../validators/quizValidators');
const { loadOwnQuiz, prepareQuizEdit } = require('../middleware/loadOwnQuiz');
const controller = require('../controllers/quizController');

const router = express.Router();

// Every quiz endpoint needs a logged-in user. Roles are set PER ROUTE because Students will use
// other quiz endpoints on this router (listing and attempts – #17/#18, VedhV).
router.use(authenticate);

const faculty = requireRole(ROLES.FACULTY); // REQ-QZ-17 / SEC-QZ-01: only Faculty manage quizzes

// #16 – quiz creation and Draft management (REQ-QZ-01 to REQ-QZ-05)
router.post('/', faculty, quizRules, validate, controller.create);
router.get('/mine', faculty, controller.listMine);
router.get('/:id', faculty, loadOwnQuiz, controller.getOne);
router.put('/:id', faculty, loadOwnQuiz, prepareQuizEdit, quizRules, validate, controller.update);
router.post('/:id/publish', faculty, loadOwnQuiz, controller.publish);

// #42 – deletion (REQ-QZ-05)
router.delete('/:id', faculty, loadOwnQuiz, controller.remove);

module.exports = router;
