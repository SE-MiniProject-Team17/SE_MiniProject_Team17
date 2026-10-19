const express = require('express');
const { register, logout } = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

router.post('/register', register);
router.post('/logout', authenticate, logout);

module.exports = router;