const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const ROLES = require('../config/roles');
const {
  getMine,
  getTopics,
  getFacultyDashboard,
} = require('../controllers/performanceController');

const router = express.Router();

router.use(authenticate);

// Faculty dashboard must be checked separately from student routes.
router.get('/faculty', requireRole(ROLES.FACULTY), getFacultyDashboard);

router.use(requireRole(ROLES.STUDENT));
router.get('/mine', getMine);
router.get('/topics', getTopics);

module.exports = router;
