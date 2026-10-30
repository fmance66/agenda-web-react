import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// tests del front (npm run test:front). Configuración aparte de vite.config.js porque ése
// importa server/api.js, que al cargarse arranca el índice de áreas y su persistencia.
// Los del server corren con node --test (npm run test:server) y los e2e con Playwright (e2e/)
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.{js,jsx}'],
    // IndexedDB en memoria, el localStorage de happy-dom y matchMedia (ver src/test/setup.js)
    setupFiles: ['./src/test/setup.js'],
    restoreMocks: true,
  },
})
