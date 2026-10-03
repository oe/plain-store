import { defineConfig } from 'vitest/config'
import dts from 'vite-plugin-dts'
import { copyFileSync } from 'node:fs'

export default defineConfig((env) => {
  if (env.mode === 'development') {
    return {
      root: './',
      server: {
        host: true,
        open: 'demo/index.html'
      },
      build: {
        rollupOptions: {
          input: {
            main: 'demo/index.html',
          },
        }
      }
    }
  }
  return {
    root: './',
    test: {
      watch: false,
      globals: true,
      environment: "jsdom",
      include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
      exclude: ['demo/**'],
      coverage: {
        exclude: ['demo/**', 'test/coverage/**'],
      },
    },
    build: {
      target: 'es2020',
      outDir: 'dist',
      lib: {
        entry: 'src/index.ts',
        name: 'PlainStore',
        formats: ['es', 'cjs', 'iife'],
        fileName: (format) => format === 'es' ? 'esm/index.mjs' : `${format}/index.js`
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
      {
        name: 'preserve-legacy-esm-path',
        closeBundle() {
          copyFileSync('dist/esm/index.mjs', 'dist/esm/index.js')
        },
      },
      dts({
        outDirs: 'dist/types',
        include: 'src/**/*',
      }),
    ],
  }
})
