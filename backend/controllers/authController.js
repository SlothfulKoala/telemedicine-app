const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // 2. Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Create and save the new user
    const newUser = new User({
      name,
      email,
      phone,
      passwordHash,
      role: role || 'patient'
    });
    
    await newUser.save();

    // 4. Generate the JWT immediately for auto-login
    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } 
    );

    // 5. Send back the token and user data just like the login endpoint
    res.status(201).json({ 
      message: "User registered and logged in successfully",
      token,
      user: { id: newUser._id, name: newUser.name, role: newUser.role }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user in the database
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2. Check if password matches the hash
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // 3. Generate the digital ID card (JWT)
    // The payload contains the user ID and their role (patient/doctor)
    const token = jwt.sign(
      { userId: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1d' } // Token expires in 1 day
    );

    res.status(200).json({ 
      token, 
      user: { id: user._id, name: user.name, role: user.role } 
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};