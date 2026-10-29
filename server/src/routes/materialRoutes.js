
const express = require('express');
const authenticate = require('../middleware/authenticate');
const { uploadMaterial } = require('../middleware/materialUpload');
const controller = require('../controllers/materialController');
const sharingController = require('../controllers/materialSharingController');

const router = express.Router();

router.use(authenticate);

router.post('/', uploadMaterial, controller.upload);
router.get('/mine', controller.getMine);
router.get('/shared', controller.getShared);
router.patch('/:id', uploadMaterial, controller.update);
router.delete('/:id', controller.remove);

// Issue #12: View and download materials
router.get('/:id/download', controller.download);
router.get('/:id', controller.getById);

// Issue #8: Share materials and revoke access
router.post('/:id/share', sharingController.share);
router.delete('/:id/share/:recipientId', sharingController.revokeShare);

module.exports = router;
