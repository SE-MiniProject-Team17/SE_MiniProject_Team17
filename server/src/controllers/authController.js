const Session = require('../models/Session');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ROLES = require('../config/roles');
const AppError = require('../utils/AppError');

const SALT_ROUNDS = 12;

async function register(req, res, next) {
  try {
    const { fullName, email, password, role } = req.body;

    if (role !== ROLES.STUDENT && role !== ROLES.FACULTY) {
      throw AppError.validation('role', 'Role must be Student or Faculty');
    }

    // Validate required fields.
    if (typeof fullName !== 'string' || !fullName.trim()) {
      throw AppError.validation('fullName', 'Full name is required');
    }

    if (fullName.trim().length > 100) {
      throw AppError.validation('fullName', 'Full name must be at most 100 characters');
    }

    if (typeof email !== 'string' || !email.trim()) {
      throw AppError.validation('email', 'Email is required');
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      throw AppError.validation('email', 'Enter a valid email address');
    }

    if (typeof password !== 'string') {
      throw AppError.validation('password', 'Password is required');
    }

    if (password.length < 8) {
      throw AppError.validation('password', 'Password must be at least 8 characters');
    }

    if (!/[A-Z]/.test(password)) {
      throw AppError.validation('password', 'Password must contain an uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      throw AppError.validation('password', 'Password must contain a lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      throw AppError.validation('password', 'Password must contain a digit');
    }

    // Role is assigned by the server. Public registration cannot grant
    // Faculty or Admin privileges through a request body.
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      throw AppError.validation('email', 'Email is already registered');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      passwordHash,
      role,
    });

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    // MongoDB's unique index protects against concurrent duplicate requests.
    if (err.code === 11000 && err.keyPattern?.email) {
      return next(AppError.validation('email', 'Email is already registered'));
    }

    return next(err);
  }
}

async function logout(req, res, next) {
  try {
    await Session.updateOne(
      {
        _id: req.session.id,
        user: req.user.id,
        revokedAt: null,
      },
      { $set: { revokedAt: new Date() } }
    );

    return res.status(200).json({ message: 'Logout successful' });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, logout };