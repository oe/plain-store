/// <reference types="vitest" />
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  test: {
    watch: false,
    globals: true,
    environment: "jsdom",
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    exclude: ['example/**'],
    coverage: {
      exclude: ['example/**', 'test/coverage/**'],
    },
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'PlainStore',
      formats: ['es','umd', 'iife'],
      fileName: (format) => `index${format === 'es' ? '' : `.${format}`}.js`
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