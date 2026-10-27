// backend/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // process.env.MONGO_URI pulls 'mongodb://127.0.0.1:27017/telemedicine' from your .env file
    const conn = await mongoose.connect(process.env.MONGO_URI);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Database connection failed: ${error.message}`);
    process.exit(1); // Shuts down the server if the database fails to connect
  }
};

module.exports = connectDB;