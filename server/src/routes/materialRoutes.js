
const express = require('express');
const authenticate = require('../middleware/authenticate');
const { uploadMaterial } = require('../middleware/materialUpload');
const controller = require('../controllers/materialController');

const router = express.Router();

router.use(authenticate);

router.post('/', uploadMaterial, controller.upload);
router.get('/mine', controller.getMine);

module.exports = router;
