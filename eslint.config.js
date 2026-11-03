import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import js from '@eslint/js';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import vitest from '@vitest/eslint-plugin';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import { createNodeResolver, importX } from 'eslint-plugin-import-x';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import oneFunctionPerFile from './eslint/rules/oneFunctionPerFile.js';

/** Every folder directly under these folders is a module. */
const MODULE_ROOTS = ['src'];

/**
 * A module's interface is the files directly in its folder. Its subfolders are
 * private: only the module itself may import them.
 */
const modulePrivacyZones = MODULE_ROOTS.flatMap((root) =>
  readdirSync(join(import.meta.dirname, root), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map(({ name }) => ({
      target: [`${root}/*.ts`, `${root}/!(${name})/**/*.ts`],
      from: [`${root}/${name}/*/**/*`],
      message: `Import ${root}/${name}/ only through a file directly in that folder.`,
    })),
);

/** Snapshots hide the expected value; write it out in the test. */
const NO_SNAPSHOT = 'Write the expected value out in the test.';

/** Fakes come in through the dependencies parameter, as the code expects. */
const NO_MODULE_MOCK = 'Pass a fake through the dependencies parameter.';

/** Test helpers stay out of the code that runs. */
const testHelperZone = {
  target: ['src/**/!(*.test).ts'],
  from: ['test/**/*'],
  message: 'Only tests may import test helpers.',
};

export default defineConfig(
  { ignores: ['coverage/'] },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
      reportUnusedInlineConfigs: 'error',
    },
  },
  js.configs.recommended,
  comments.recommended,
  {
    languageOptions: { globals: globals.node },
    plugins: { 'import-x': importX },
    settings: { 'import-x/resolver-next': [createNodeResolver()] },
    rules: {
      '@eslint-community/eslint-comments/require-description': 'error',
      eqeqeq: ['error', 'always'],
      'import-x/extensions': [
        'error',
        'ignorePackages',
        { checkTypeImports: true },
      ],
      'import-x/no-restricted-paths': [
        'error',
        {
          basePath: import.meta.dirname,
          zones: [...modulePrivacyZones, testHelperZone],
        },
      ],
      'import-x/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['sibling', 'parent'],
            'index',
            'unknown',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'sort-imports': [
        'error',
        { ignoreCase: true, ignoreDeclarationSort: true },
      ],
    },
  },
  {
    files: ['**/*.ts'],
    extends: [
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-confusing-void-expression': [
        'error',
        { ignoreArrowShorthand: true },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-use-before-define': [
        'error',
        { classes: false, functions: false, typedefs: false, variables: true },
      ],
      /**
       * Every option is set: a partial object turns the others back to their
       * lenient defaults. Numbers are fine in text; null and undefined are
       * not.
       */
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowAny: false,
          allowBoolean: false,
          allowNever: false,
          allowNullish: false,
          allowNumber: true,
          allowRegExp: false,
        },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { requireDefaultForNonUnion: true },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['**/*.test.ts'],
    plugins: {
      local: { rules: { 'one-function-per-file': oneFunctionPerFile } },
    },
    rules: { 'local/one-function-per-file': 'error' },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportAllDeclaration, ExportNamedDeclaration[source]',
          message:
            'Import from the file that defines it; there are no barrels.',
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      /**
       * Hunk serves hunkdiff/extension to every extension and installs nothing
       * else for this one, so that is the only package the code may import.
       */
      'import-x/no-extraneous-dependencies': [
        'error',
        { devDependencies: false, includeTypes: true, whitelist: ['hunkdiff'] },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,js}'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      'vitest/no-restricted-matchers': [
        'error',
        {
          toMatchSnapshot: NO_SNAPSHOT,
          toMatchInlineSnapshot: NO_SNAPSHOT,
          toMatchFileSnapshot: NO_SNAPSHOT,
          toThrowErrorMatchingSnapshot: NO_SNAPSHOT,
          toThrowErrorMatchingInlineSnapshot: NO_SNAPSHOT,
        },
      ],
      'vitest/no-restricted-vi-methods': [
        'error',
        { mock: NO_MODULE_MOCK, doMock: NO_MODULE_MOCK },
      ],
      'vitest/require-top-level-describe': 'error',
    },
  },
  prettier,
);
