import { RuleTester } from 'eslint';
import { afterAll, describe, it } from 'vitest';

import oneFunctionPerFile from './oneFunctionPerFile.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
});

const tooMany = (count) => ({
  messageId: 'tooMany',
  data: { count: String(count) },
});

ruleTester.run('one-function-per-file', oneFunctionPerFile, {
  valid: [
    {
      name: 'one arrow function with a default export',
      code: 'const run = () => 1;\nexport default run;',
    },
    {
      name: 'one function declaration',
      code: 'function run() { return 1; }',
    },
    {
      name: 'helpers nested in the one function',
      code: 'const run = () => {\n  const helper = () => 1;\n  function other() { return 2; }\n  return helper() + other();\n};',
    },
    {
      name: 'constants, objects and classes next to one function',
      code: 'const LIMIT = 3;\nconst table = { a: 1, b() { return 2; } };\nclass Box {}\nconst run = () => LIMIT;',
    },
    {
      name: 'a file without functions',
      code: 'export const LIMIT = 3;',
    },
  ],
  invalid: [
    {
      name: 'two arrow functions',
      code: 'const first = () => 1;\nconst second = () => 2;',
      errors: [tooMany(2)],
    },
    {
      name: 'a function declaration and a function expression',
      code: 'function first() {}\nconst second = function () {};',
      errors: [tooMany(2)],
    },
    {
      name: 'exported functions',
      code: 'export const first = () => 1;\nexport function second() {}\nexport default () => 3;',
      errors: [tooMany(3), tooMany(3)],
    },
    {
      name: 'two functions in one variable declaration',
      code: 'const first = () => 1, second = () => 2;',
      errors: [tooMany(2)],
    },
  ],
});
