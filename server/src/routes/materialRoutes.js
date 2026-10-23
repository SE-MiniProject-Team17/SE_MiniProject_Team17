const express = require('express');
const authenticate = require('../middleware/authenticate');
const { uploadMaterial } = require('../middleware/materialUpload');
const controller = require('../controllers/materialController');
const sharingController = require('../controllers/materialSharingController');

const router = express.Router();

router.use(authenticate);

router.post('/', uploadMaterial, controller.upload);
router.get('/mine', controller.getMine);
router.post('/:id/share', sharingController.share);
router.delete('/:id/share/:recipientId', sharingController.revokeShare);

module.exports = router;
