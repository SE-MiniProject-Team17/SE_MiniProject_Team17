const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const ROLES = require('../config/roles');
const { questionRules } = require('../validators/questionValidators');
const controller = require('../controllers/questionController');

const router = express.Router();

// REQ-QB-07 / SEC-QZ-01: the whole question bank is Faculty-only.
// Order (SAD 4.1): authentication -> role check -> validation -> controller.
router.use(authenticate, requireRole(ROLES.FACULTY));

// #13 – add a question
router.post('/', questionRules, validate, controller.create);

module.exports = router;
