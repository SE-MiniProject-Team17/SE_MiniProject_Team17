const express = require('express');
const authenticate = require('../middleware/authenticate');
const { uploadMaterial } = require('../middleware/materialUpload');
const controller = require('../controllers/materialController');

const router = express.Router();

router.use(authenticate);

router.post('/', uploadMaterial, controller.upload);
router.get('/mine', controller.getMine);
router.get('/:id/download', controller.download);
router.get('/:id', controller.getById);

module.exports = router;
