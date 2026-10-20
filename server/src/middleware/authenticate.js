
const jwt = require('jsonwebtoken');
const Session = require('../models/Session');
const AppError = require('../utils/AppError');

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
const EXPIRY_MESSAGE = 'Session expired. Please log in again.';

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(AppError.notAuthenticated());
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload.sub || !payload.jti) {
      return next(AppError.notAuthenticated());
    }

    const session = await Session.findOne({
      tokenId: payload.jti,
      user: payload.sub,
      revokedAt: null,
    });

    if (!session) {
      return next(AppError.notAuthenticated(EXPIRY_MESSAGE));
    }

    const now = Date.now();
    const lastActivity = new Date(session.lastActivityAt).getTime();

    if (
      !Number.isFinite(lastActivity) ||
      now - lastActivity >= INACTIVITY_LIMIT_MS ||
      new Date(session.expiresAt).getTime() <= now
    ) {
      if (!session.revokedAt) {
        session.revokedAt = new Date(now);
        await session.save();
      }

      return next(AppError.notAuthenticated(EXPIRY_MESSAGE));
    }

    session.lastActivityAt = new Date(now);
    session.expiresAt = new Date(now + INACTIVITY_LIMIT_MS);
    await session.save();

    req.user = { id: payload.sub, role: payload.role };
    req.session = { id: session._id.toString(), tokenId: payload.jti };

    return next();
  } catch (err) {
    if (err instanceof AppError) {
      return next(err);
    }

    return next(AppError.notAuthenticated());
  }
}

module.exports = authenticate;
module.exports.INACTIVITY_LIMIT_MS = INACTIVITY_LIMIT_MS;
module.exports.EXPIRY_MESSAGE = EXPIRY_MESSAGE;
