// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Allows external tunnel domains (like trycloudflare.com) to access the Vite dev server
    allowedHosts: [
      '.trycloudflare.com',  // Allows any subdomain of trycloudflare.com
      'localhost',
      '127.0.0.1'
    ],
    // Alternatively, you can use 'all' if you prefer:
    // allowedHosts: 'all'
  }
});
