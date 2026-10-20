
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Session = require('../../src/models/Session');

async function tokenFor(role, id = new mongoose.Types.ObjectId().toString()) {
  const tokenId = crypto.randomUUID();
  const now = Date.now();

  await Session.create({
    user: id,
    tokenId,
    lastActivityAt: new Date(now),
    expiresAt: new Date(now + 30 * 60 * 1000),
  });

  const token = jwt.sign(
    { sub: id, role, jti: tokenId },
    process.env.JWT_SECRET,
    { expiresIn: '30m' }
  );

  return { id, role, token, tokenId };
}

module.exports = { tokenFor };
