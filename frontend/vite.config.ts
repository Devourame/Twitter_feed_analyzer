import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Proxy is not required: the backend enables CORS for all origins.
    // The API base URL is configured via VITE_API_BASE_URL (see .env.example).
  }
});
