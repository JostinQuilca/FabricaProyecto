const jwt = require('jsonwebtoken');

function verifyToken(token) {
  try {
    if (!token) return null;
    const cleanToken = token.replace('Bearer ', '');
    return jwt.verify(cleanToken, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = { verifyToken };
