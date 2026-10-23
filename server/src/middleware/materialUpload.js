
const multer = require('multer');
const AppError = require('../utils/AppError');

const MAX_MATERIAL_BYTES = 25 * 1024 * 1024;

const ALLOWED_TYPES = {
  'application/pdf': {
    extension: '.pdf',
    signature: (b) => b.subarray(0, 5).toString() === '%PDF-',
  },
  'image/png': {
    extension: '.png',
    signature: (b) =>
      b.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
      ),
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    extension: '.docx',
  },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
    extension: '.pptx',
  },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_MATERIAL_BYTES,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    if (!Object.hasOwn(ALLOWED_TYPES, file.mimetype)) {
      return callback(
        AppError.validation(
          'file',
          'Only PDF, DOCX, PPTX, and PNG files are supported'
        )
      );
    }

    callback(null, true);
  },
});

function validateFileSignature(file) {
  const type = ALLOWED_TYPES[file.mimetype];

  if (!type) {
    throw AppError.validation('file', 'Unsupported file type');
  }

  if (type.signature && !type.signature(file.buffer)) {
    throw AppError.validation(
      'file',
      'File content does not match its declared type'
    );
  }

  // DOCX and PPTX are ZIP containers. Verify their ZIP signature here;
  // the service will perform deeper format validation before saving.
  if (
    (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') &&
    !file.buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
  ) {
    throw AppError.validation(
      'file',
      'File content does not match its declared type'
    );
  }
}

function uploadMaterial(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(
        AppError.validation('file', 'File must not exceed 25 MiB')
      );
    }

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_COUNT') {
      return next(AppError.validation('file', 'Upload exactly one file'));
    }

    if (err instanceof AppError) return next(err);

    return next(err);
  });
}

module.exports = {
  uploadMaterial,
  validateFileSignature,
  MAX_MATERIAL_BYTES,
};

