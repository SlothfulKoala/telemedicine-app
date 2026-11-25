const jwt = require('jsonwebtoken');

const AUTH_COOKIE_NAME = 'accessToken';

function getAuthCookieOptions() {
  const isCrossSiteHttps =
    process.env.NODE_ENV === 'production' ||
    (process.env.FRONTEND_ORIGIN || '').startsWith('https://');

  return {
    httpOnly: true,
    secure: isCrossSiteHttps,
    sameSite: isCrossSiteHttps ? 'none' : 'lax',
    path: '/',
  };
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (
    !secret ||
    secret.length < 32 ||
    secret.startsWith('replace-with-')
  ) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  }

  return secret;
}

function createAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

module.exports = {
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
  getJwtSecret,
  createAccessToken,
};
