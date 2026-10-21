const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const ROLES = require('../config/roles');
const { questionRules, searchRules } = require('../validators/questionValidators');
const controller = require('../controllers/questionController');
const { loadOwnQuestion, mergeQuestionEdits } = require('../middleware/loadOwnQuestion');

const router = express.Router();

// REQ-QB-07 / SEC-QZ-01: the whole question bank is Faculty-only.
// Order (SAD 4.1): authentication -> role check -> validation -> controller.
router.use(authenticate, requireRole(ROLES.FACULTY));

// #13 – add a question
router.post('/', questionRules, validate, controller.create);

// #14 – search and filter the bank, and list topics for the filter
router.get('/', searchRules, validate, controller.search);
router.get('/topics', controller.topics);

// #15 / #41 – view one question; owner-only edit and remove (REQ-QB-05, REQ-QB-06, REQ-QB-07)
// Order: ownership check -> merge partial edit -> same validation as a new question -> save.
router.get('/:id', controller.getOne);
router.put('/:id', loadOwnQuestion, mergeQuestionEdits, questionRules, validate, controller.update);
router.delete('/:id', loadOwnQuestion, controller.remove);

module.exports = router;
