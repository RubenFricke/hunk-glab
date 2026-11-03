import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts', 'eslint/**/*.test.js'],
    coverage: {
      provider: 'v8',
      /** Without include, a file that no test imports is not counted. */
      include: ['src/**/*.ts', 'eslint/**/*.js'],
      exclude: [
        '**/*.test.{ts,js}',
        /** Entry point: test/loadsInHunk.test.ts loads src/index.ts in Hunk. */
        'src/index.ts',
      ],
      /**
       * Shows the coverage without a threshold: the table in the output, and a
       * copy that CI adds to the run summary.
       */
      reporter: ['text', ['text', { file: 'coverage.txt' }]],
    },
  },
});
