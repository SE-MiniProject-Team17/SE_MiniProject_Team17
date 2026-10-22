
const multer = require('multer');
const AppError = require('../utils/AppError');

const MAX_PROFILE_PICTURE_BYTES = 2 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PROFILE_PICTURE_BYTES,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        AppError.validation(
          'profilePicture',
          'Profile picture must be a JPEG, PNG, or WebP image'
        )
      );
    }

    callback(null, true);
  },
});

function uploadProfilePicture(req, res, next) {
  upload.single('profilePicture')(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(
        AppError.validation(
          'profilePicture',
          'Profile picture must not exceed 2 MB'
        )
      );
    }

    if (err instanceof AppError) return next(err);

    return next(err);
  });
}

module.exports = {
  uploadProfilePicture,
  MAX_PROFILE_PICTURE_BYTES,
};
