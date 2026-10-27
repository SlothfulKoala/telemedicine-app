
const jwt = require('jsonwebtoken');
const { User, DoctorProfile } = require('../models/model');
const { AUTH_COOKIE_NAME, getJwtSecret } = require('../config/auth');

function getTokenFromRequest(req) {
  const authorization = req.headers.authorization;
  if (authorization && authorization.startsWith('Bearer ')) {
    return authorization.slice(7);
  }

  const cookie = req.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`));

  return cookie?.slice(AUTH_COOKIE_NAME.length + 1);
}

async function authenticate(req, res, next) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({
        message: 'Authentication token required.',
      });
    }

    const payload = jwt.verify(token, getJwtSecret());

    const user = await User.findById(payload.sub);

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: 'Invalid or inactive account.',
      });
    }

    req.auth = {
      userId: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
    };

    return next();
  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError' ||
      error.name === 'NotBeforeError'
    ) {
      return res.status(401).json({
        message: 'Invalid or expired token.',
      });
    }

    next(error);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({
        message: 'You do not have permission to access this resource.',
      });
    }

    next();
  };
}

async function requireVerifiedDoctor(req, res, next) {
  try {
    if (req.auth?.role !== 'doctor') {
      return res.status(403).json({
        message: 'Doctor access required.',
      });
    }

    const profile = await DoctorProfile.findOne({
      userId: req.auth.userId,
      verificationStatus: 'verified',
      isAcceptingBookings: true,
    });

    if (!profile) {
      return res.status(403).json({
        message: 'Doctor verification or booking access is not enabled.',
      });
    }

    req.doctorProfile = profile;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  authenticate,
  requireRole,
  requireVerifiedDoctor,
};
