/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  optimizeDeps: {
    include: [
      '@clerk/react',
      '@clerk/react/internal',
      '@clerk/shared/error',
      '@clerk/shared/getEnvVariable',
      '@clerk/shared/getToken',
      '@clerk/shared/htmlSafeJson',
      '@clerk/shared/underscore',
      '@tanstack/router-core',
      '@tanstack/router-core/isServer',
      '@tanstack/router-core/ssr/client',
      'seroval',
    ],
  },
  plugins: [devtools(), netlify(), tailwindcss(), tanstackStart(), viteReact()],
  test: {
    // Playwright specs in e2e/ run via `npm run test:e2e`, not vitest
    exclude: ['e2e/**', 'node_modules/**'],
    passWithNoTests: true,
  },
})

export default config
