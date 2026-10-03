import { defineConfig } from 'vitest/config'
import dts from 'vite-plugin-dts'

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
      dts({
        outDirs: 'dist/types',
        include: 'src/**/*',
      }),
    ],
  }
})
