import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'test/**/*.test.ts',
      'scripts/**/*.test.ts',
      'eslint/**/*.test.js',
    ],
    coverage: {
      provider: 'v8',
      /** Without include, a file that no test imports is not counted. */
      include: ['src/**/*.ts', 'scripts/**/*.ts', 'eslint/**/*.js'],
      exclude: [
        '**/*.test.{ts,js}',
        /** Entry point: test/loadsInHunk.test.ts loads src/index.ts in Hunk. */
        'src/index.ts',
        /** Entry point: the Release workflow runs it; it talks to git. */
        'scripts/release.ts',
      ],
      /**
       * Shows the coverage without a threshold: the table in the output, and a
       * copy that CI adds to the run summary.
       */
      reporter: ['text', ['text', { file: 'coverage.txt' }]],
    },
  },
});
