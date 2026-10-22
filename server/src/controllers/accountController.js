
const User = require('../models/User');
const AppError = require('../utils/AppError');
const {
  MAX_PROFILE_PICTURE_BYTES,
} = require('../middleware/profilePictureUpload');

function detectImageType(buffer) {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    )
  ) {
    return 'image/png';
  }

  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

function publicProfile(user) {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    institution: user.institution || '',
    profilePicture: user.profilePicture || '',
    email: user.email,
    role: user.role,
  };
}

async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      throw AppError.notFound('User unavailable');
    }

    return res.status(200).json({ user: publicProfile(user) });
  } catch (err) {
    return next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      throw AppError.notFound('User unavailable');
    }

    const body = req.body || {};
    const allowedFields = ['fullName', 'institution'];

    const forbiddenFields = ['email', 'role', 'password', 'passwordHash', 'userId', 'id'];
    for (const field of forbiddenFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        throw AppError.validation(
          field,
          `${field} cannot be changed through profile editing`
        );
      }
    }

    const allowedBodyFields = [...allowedFields];
    for (const field of Object.keys(body)) {
      if (!allowedBodyFields.includes(field)) {
        throw AppError.validation(field, 'Unsupported profile field');
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'fullName')) {
      if (typeof body.fullName !== 'string' || !body.fullName.trim()) {
        throw AppError.validation('fullName', 'Name cannot be empty');
      }

      if (body.fullName.trim().length > 100) {
        throw AppError.validation(
          'fullName',
          'Name must be at most 100 characters'
        );
      }

      user.fullName = body.fullName.trim();
    }

    if (Object.prototype.hasOwnProperty.call(body, 'institution')) {
      if (typeof body.institution !== 'string') {
        throw AppError.validation(
          'institution',
          'Institution must be a string'
        );
      }

      if (body.institution.trim().length > 200) {
        throw AppError.validation(
          'institution',
          'Institution must be at most 200 characters'
        );
      }

      user.institution = body.institution.trim();
    }

    if (req.file) {
      const buffer = req.file.buffer;

      if (!buffer || buffer.length === 0) {
        throw AppError.validation('profilePicture', 'Image cannot be empty');
      }

      if (buffer.length > MAX_PROFILE_PICTURE_BYTES) {
        throw AppError.validation(
          'profilePicture',
          'Profile picture must not exceed 2 MB'
        );
      }

      const actualType = detectImageType(buffer);

      if (!actualType || actualType !== req.file.mimetype) {
        throw AppError.validation(
          'profilePicture',
          'Uploaded file is not a valid JPEG, PNG, or WebP image'
        );
      }

      user.profilePicture =
        `data:${actualType};base64,${buffer.toString('base64')}`;
    }

    await user.save();

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: publicProfile(user),
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return next(
        AppError.validation('profile', 'Profile data is invalid')
      );
    }

    return next(err);
  }
}

module.exports = { getProfile, updateProfile };
