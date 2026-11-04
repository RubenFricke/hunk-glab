import { describe, expect, it } from 'vitest';

import hasHelpFlag from './hasHelpFlag.ts';

describe('hasHelpFlag', () => {
  it.each([[['--help']], [['-h']], [['123', '--repo', 'a/b', '--help']]])(
    'finds the help flag in %j',
    (args) => {
      expect(hasHelpFlag(args)).toBe(true);
    },
  );

  it.each([[[]], [['123']], [['123', '--', '--help']], [['--', '-h']]])(
    'finds no help flag in %j',
    (args) => {
      expect(hasHelpFlag(args)).toBe(false);
    },
  );
});
