
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const {
  User,
  PatientProfile,
  DoctorProfile,
} = require('../models');

// Generate an access token for any role.
function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      adminType: user.adminType || undefined,
      hospitalId: user.hospitalId
        ? user.hospitalId.toString()
        : undefined,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

// Remove sensitive fields before returning a user.
function safeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    adminType: user.adminType,
    hospitalId: user.hospitalId,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
  };
}

// POST /api/auth/register
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
  } = req.body;

  // Public registration is limited to patients and doctors.
  if (!['patient', 'doctor'].includes(role)) {
    return res.status(400).json({
      message: 'Public registration is only available for patients and doctors.',
    });
  }

  if (!name || !email || !phone || !password) {
    return res.status(400).json({
      message: 'Name, email, phone and password are required.',
    });
  }

  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({
      message: 'Password must contain at least 8 characters.',
    });
  }

  if (role === 'doctor') {
    if (!regNumber || fee === undefined || fee === null) {
      return res.status(400).json({
        message: 'Doctor registration requires regNumber and fee.',
      });
    }

    if (!Number.isSafeInteger(fee) || fee < 0) {
      return res.status(400).json({
        message: 'Fee must be a non-negative integer in paise.',
      });
    }
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone.trim();

  // Passwords must never be stored in plaintext.
  const passwordHash = await bcrypt.hash(password, 12);

  const session = await mongoose.startSession();

  let createdUser;

  try {
    await session.withTransaction(async () => {
      const [user] = await User.create(
        [{
          name: name.trim(),
          email: normalizedEmail,
          phone: normalizedPhone,
          passwordHash,
          role,
          // Doctors remain unverified until approved.
        }],
        { session }
      );

      if (role === 'patient') {
        await PatientProfile.create(
          [{ userId: user._id }],
          { session }
        );
      }

      if (role === 'doctor') {
        await DoctorProfile.create(
          [{
            userId: user._id,
            regNumber: regNumber.trim(),
            fee,
            specialisations: specialisations || [],
            verificationStatus: 'pending',
            isAcceptingBookings: false,
          }],
          { session }
        );
      }

      createdUser = user;
    });

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
  } finally {
    await session.endSession();
  }
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;

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

  // Use the same error for unknown emails and wrong passwords.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({
      message: 'Invalid email or password.',
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      message: 'This account is inactive.',
    });
  }

  // Don't issue a normal login token to an expired lockout.
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return res.status(423).json({
      message: 'Account temporarily locked. Try again later.',
    });
  }

  user.failedLoginCount = 0;
  user.lockedUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = generateAccessToken(user);

  return res.status(200).json({
    message: 'Login successful.',
    accessToken,
    tokenType: 'Bearer',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    user: safeUser(user),
  });
}

module.exports = { register, login };
