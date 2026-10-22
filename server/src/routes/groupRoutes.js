
const express = require('express');

const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const ROLES = require('../config/roles');
const controller = require('../controllers/groupController');

const router = express.Router();

// All group endpoints require an authenticated session.
router.use(authenticate);

// Student-only study-group operations.
router.post('/', requireRole(ROLES.STUDENT), controller.create);
router.post('/:groupId/join', requireRole(ROLES.STUDENT), controller.join);
router.get('/mine', requireRole(ROLES.STUDENT), controller.getMine);

module.exports = router;
