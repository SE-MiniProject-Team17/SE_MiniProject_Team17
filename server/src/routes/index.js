const express = require('express');

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));

router.use('/auth', require('./authRoutes'));

module.exports = router;
