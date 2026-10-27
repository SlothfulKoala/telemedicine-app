// backend/server.js
require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Telemedicine server is active on http://localhost:${PORT}`);
});
