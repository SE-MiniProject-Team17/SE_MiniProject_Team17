
const express = require('express');
const authenticate = require('../middleware/authenticate');
const {
  uploadProfilePicture,
} = require('../middleware/profilePictureUpload');
const {
  getProfile,
  updateProfile,
} = require('../controllers/accountController');

const router = express.Router();

router.get('/profile', authenticate, getProfile);

router.patch(
  '/profile',
  authenticate,
  uploadProfilePicture,
  updateProfile
);

module.exports = router;
