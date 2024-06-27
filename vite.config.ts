/// <reference types="vitest" />

import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  test: {
    watch: false,
    include: ['test/**/*.test.ts'],
    exclude: ['example/**'],
    coverage: {
      exclude: ['example/**', 'test/coverage/**'],
    },
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'useStore',
      formats: ['es','umd', 'iife'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['react'],
      output: {
        globals: {
          react: 'React',
        },
      },
    },
  },
  plugins: [
    dts({
      rollupTypes: true
    }),
  ],
})