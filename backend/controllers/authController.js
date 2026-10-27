
const bcrypt = require('bcryptjs');
const {
  AUTH_COOKIE_NAME,
  createAccessToken,
  getAuthCookieOptions,
} = require('../config/auth');
const {
  User,
  PatientProfile,
  DoctorProfile,
} = require('../models/model');

function setAuthCookie(res, user) {
  const token = createAccessToken(user);
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

function safeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
  };
}

async function register(req, res) {
  const {
    name,
    email,
    phone,
    password,
    role,
    regNumber,
    fee,
    specialisations,
  } = req.body || {};

  // Public registration is limited to patients and doctors.
  if (!['patient', 'doctor'].includes(role)) {
    return res.status(400).json({
      message: 'Public registration is only available for patients and doctors.',
    });
  }

  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof phone !== 'string' ||
    typeof password !== 'string' ||
    !name.trim() ||
    !email.trim() ||
    !phone.trim() ||
    !password
  ) {
    return res.status(400).json({
      message: 'Name, email, phone and password are required.',
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({
      message: 'Enter a valid email address.',
    });
  }

  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({
      message: 'Password must contain at least 8 characters and no more than 72 bytes.',
    });
  }

  if (role === 'doctor') {
    if (typeof regNumber !== 'string' || !regNumber.trim() || fee === undefined || fee === null) {
      return res.status(400).json({
        message: 'Doctor registration requires regNumber and fee.',
      });
    }

    if (!Number.isSafeInteger(fee) || fee < 0) {
      return res.status(400).json({
        message: 'Fee must be a non-negative integer in paise.',
      });
    }

    if (specialisations !== undefined && !Array.isArray(specialisations)) {
      return res.status(400).json({
        message: 'Specialisations must be an array.',
      });
    }
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone.trim();
  const passwordHash = await bcrypt.hash(password, 12);

  let createdUser;

  try {
    createdUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
      role,
    });

    if (role === 'patient') {
      await PatientProfile.create({ userId: createdUser._id });
    }

    if (role === 'doctor') {
      await DoctorProfile.create({
        userId: createdUser._id,
        regNumber: regNumber.trim(),
        fee,
        specialisations: specialisations || [],
        verificationStatus: 'pending',
        isAcceptingBookings: false,
      });
    }

    setAuthCookie(res, createdUser);
    return res.status(201).json({
      message: role === 'doctor'
        ? 'Registration successful. Your doctor account is pending verification.'
        : 'Patient registration successful.',
      user: safeUser(createdUser),
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];

      return res.status(409).json({
        message: field === 'email'
          ? 'Email is already registered.'
          : field === 'phone'
            ? 'Phone number is already registered.'
            : field === 'regNumber'
              ? 'Medical registration number is already registered.'
              : 'An account with these details already exists.',
      });
    }

    throw error;
  }
}

async function login(req, res) {
  const { email, password } = req.body || {};

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      message: 'Email and password are required.',
    });
  }

  const user = await User.findOne({
    email: email.trim().toLowerCase(),
  }).select('+passwordHash');

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    if (user) {
      user.failedLoginCount += 1;
      if (user.failedLoginCount >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();
    }

    return res.status(401).json({
      message: 'Invalid email or password.',
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      message: 'This account is inactive.',
    });
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return res.status(423).json({
      message: 'Account temporarily locked. Try again later.',
    });
  }

  user.failedLoginCount = 0;
  user.lockedUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();

  setAuthCookie(res, user);

  return res.status(200).json({
    message: 'Login successful.',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    user: safeUser(user),
  });
}

async function getCurrentUser(req, res) {
  const user = await User.findById(req.auth.userId);
  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'Invalid or inactive account.' });
  }

  return res.json({ user: safeUser(user) });
}

function logout(req, res) {
  res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieOptions());
  return res.json({ message: 'Logged out successfully.' });
}

module.exports = { register, login, getCurrentUser, logout };
