const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Attempt connection using URI stored in environment variables
    const conn = await mongoose.connect(process.env.MONGO_URI);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    // Exit process with failure code if connection fails
    process.exit(1); 
  }
};

module.exports = connectDB;