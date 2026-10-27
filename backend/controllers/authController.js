
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
  Specialisation,
} = require('../models/model');

function setAuthCookie(res, user) {
  const token = createAccessToken(user);
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

function safeUser(user, onboardingComplete = true) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
    onboardingComplete,
  };
}

function normalizeSpecialisationName(value) {
  const name = value.trim().replace(/\s+/g, ' ');
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return { name, slug };
}

async function register(req, res) {
  const {
    name,
    email,
    phone,
    password,
    role,
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

    setAuthCookie(res, createdUser);
    return res.status(201).json({
      message: role === 'doctor'
        ? 'Account created. Complete your professional profile to continue.'
        : 'Patient registration successful.',
      user: safeUser(createdUser, role !== 'doctor'),
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];

      return res.status(409).json({
        message: field === 'email'
          ? 'Email is already registered.'
          : field === 'phone'
            ? 'Phone number is already registered.'
            : 'An account with these details already exists.',
      });
    }

    throw error;
  }
}

async function completeDoctorProfile(req, res) {
  const {
    regNumber,
    fee,
    specialisations,
    qualifications,
  } = req.body || {};

  if (typeof regNumber !== 'string' || !regNumber.trim()) {
    return res.status(400).json({
      message: 'Medical registration number is required.',
    });
  }

  if (!Number.isSafeInteger(fee) || fee < 0) {
    return res.status(400).json({
      message: 'Consultation fee must be a non-negative integer in paise.',
    });
  }

  if (
    !Array.isArray(specialisations) ||
    specialisations.length === 0 ||
    specialisations.some((name) => typeof name !== 'string' || !name.trim())
  ) {
    return res.status(400).json({
      message: 'Enter at least one valid specialisation.',
    });
  }

  if (!Array.isArray(qualifications) || qualifications.length === 0) {
    return res.status(400).json({
      message: 'Add at least one qualification.',
    });
  }

  const invalidQualification = qualifications.some((qualification) =>
    !qualification ||
    typeof qualification.degree !== 'string' ||
    !qualification.degree.trim() ||
    typeof qualification.institute !== 'string' ||
    !qualification.institute.trim() ||
    !Number.isInteger(qualification.year) ||
    qualification.year < 1900 ||
    qualification.year > new Date().getFullYear() + 1
  );

  if (invalidQualification) {
    return res.status(400).json({
      message: 'Each qualification needs a degree, institution, and valid year.',
    });
  }

  const normalizedSpecialisations = specialisations.map(normalizeSpecialisationName);
  if (normalizedSpecialisations.some(({ slug }) => !slug)) {
    return res.status(400).json({
      message: 'Enter valid specialisation names.',
    });
  }

  const uniqueSpecialisations = [
    ...new Map(normalizedSpecialisations.map((item) => [item.slug, item])).values(),
  ];
  const specialisationRecords = [];

  for (const { name, slug } of uniqueSpecialisations) {
    let specialisation = await Specialisation.findOne({ slug });

    if (!specialisation) {
      try {
        specialisation = await Specialisation.create({ name, slug });
      } catch (error) {
        if (error.code !== 11000) throw error;
        specialisation = await Specialisation.findOne({ slug });
      }
    }

    if (!specialisation || !specialisation.isActive) {
      return res.status(400).json({
        message: `The specialisation "${name}" is not available.`,
      });
    }

    specialisationRecords.push(specialisation);
  }

  try {
    await DoctorProfile.create({
      userId: req.auth.userId,
      regNumber: regNumber.trim(),
      fee,
      specialisations: specialisationRecords.map(({ _id }) => _id),
      qualifications: qualifications.map((qualification) => ({
        degree: qualification.degree.trim(),
        institute: qualification.institute.trim(),
        year: qualification.year,
      })),
      verificationStatus: 'pending',
      isAcceptingBookings: false,
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return res.status(409).json({
        message: field === 'regNumber'
          ? 'Medical registration number is already registered.'
          : 'A doctor profile already exists for this account.',
      });
    }

    throw error;
  }

  return res.json({
    message: 'Professional profile completed. Your account is pending verification.',
    user: {
      id: req.auth.userId,
      name: req.auth.name,
      email: req.auth.email,
      phone: req.auth.phone,
      role: req.auth.role,
      isEmailVerified: req.auth.isEmailVerified,
      isPhoneVerified: req.auth.isPhoneVerified,
      onboardingComplete: true,
    },
  });
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

  const onboardingComplete = user.role !== 'doctor' ||
    Boolean(await DoctorProfile.exists({ userId: user._id }));

  setAuthCookie(res, user);

  return res.status(200).json({
    message: 'Login successful.',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    user: safeUser(user, onboardingComplete),
  });
}

async function getCurrentUser(req, res) {
  const user = await User.findById(req.auth.userId);
  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'Invalid or inactive account.' });
  }

  const onboardingComplete = user.role !== 'doctor' ||
    Boolean(await DoctorProfile.exists({ userId: user._id }));

  return res.json({ user: safeUser(user, onboardingComplete) });
}

function logout(req, res) {
  res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieOptions());
  return res.json({ message: 'Logged out successfully.' });
}

module.exports = {
  register,
  login,
  getCurrentUser,
  completeDoctorProfile,
  logout,
};
