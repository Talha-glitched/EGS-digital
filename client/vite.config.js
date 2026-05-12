import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
<<<<<<< HEAD
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
=======
>>>>>>> 67f76e82f1c21460e724886377eab7e0a3251f53
  },
});
