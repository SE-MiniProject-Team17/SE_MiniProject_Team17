
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Session = require('../models/Session');

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;

async function createSession(user) {
  const now = Date.now();
  const tokenId = crypto.randomUUID();

  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role, jti: tokenId },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  await Session.create({
    user: user._id,
    tokenId,
    lastActivityAt: new Date(now),
    expiresAt: new Date(now + INACTIVITY_LIMIT_MS),
  });

  return { token, tokenId };
}

module.exports = { createSession, INACTIVITY_LIMIT_MS };
