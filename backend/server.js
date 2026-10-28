// backend/server.js
const path = require('path');

// 1. Explicitly load environment variables first
require('dotenv').config({ path: path.join(__dirname, '.env') });

// 2. Import the configured Express app AFTER dotenv is loaded
const app = require('./app');

const PORT = process.env.PORT || 5000;

// 3. Start the server
app.listen(PORT, () => {
  console.log(`Telemedicine server is active on http://localhost:${PORT}`);
});