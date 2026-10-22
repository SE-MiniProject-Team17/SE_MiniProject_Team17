
const mongoose = require('mongoose');
const ROLES = require('../config/roles');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Full name must be at most 100 characters'],
    },
    institution: {
      type: String,
      trim: true,
      maxlength: [200, 'Institution must be at most 200 characters'],
      default: '',
    },
    profilePicture: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email must be at most 254 characters'],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'],
      unique: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    role: {
      type: String,
      enum: [ROLES.STUDENT, ROLES.FACULTY, ROLES.ADMIN],
      required: true,
      default: ROLES.STUDENT,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
