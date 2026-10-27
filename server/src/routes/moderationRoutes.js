
const express = require('express');

const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const ROLES = require('../config/roles');
const controller = require('../controllers/moderationController');

const router = express.Router();

router.use(authenticate, requireRole(ROLES.ADMIN));

router.get('/groups', controller.listGroups);
router.patch('/groups/:id', controller.moderateGroup);

router.get('/materials', controller.listMaterials);
router.patch('/materials/:id', controller.moderateMaterial);

module.exports = router;
