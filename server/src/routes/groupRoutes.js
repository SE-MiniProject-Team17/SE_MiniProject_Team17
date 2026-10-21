const express = require('express');

const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const ROLES = require('../config/roles');

const { groupCreationRules } = require('../validators/groupValidators');
const controller = require('../controllers/groupController');

const router = express.Router();

// All group endpoints require an authenticated Student.
router.use(authenticate, requireRole(ROLES.STUDENT));

// REQ-COL-01: Create a study group.
router.post(
  '/',
  groupCreationRules,
  validate,
  controller.create
);

// REQ-COL-04: List the current student's groups.
router.get('/mine', controller.getMine);

// REQ-COL-02 and REQ-COL-03: Join a group, preventing duplicates.
router.post('/:groupId/join', controller.join);

module.exports = router;