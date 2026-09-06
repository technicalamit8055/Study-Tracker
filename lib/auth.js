const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'stet_2026_default_secret_key_change_me';

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '60d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Extracts and verifies JWT from request headers
 */
function getAuthUser(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return verifyToken(parts[1]);
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  getAuthUser
};
