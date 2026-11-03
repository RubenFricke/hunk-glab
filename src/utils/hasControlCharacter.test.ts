import { describe, expect, it } from 'vitest';

import hasControlCharacter from './hasControlCharacter.ts';

describe('hasControlCharacter', () => {
  it('accepts plain text, punctuation and non-ASCII letters', () => {
    expect(hasControlCharacter('group/sub-group/project!123')).toBe(false);
    expect(hasControlCharacter('café ✓')).toBe(false);
  });

  it.each([
    ['NUL', '\u0000'],
    ['escape', '\u001b[31m'],
    ['newline', 'mr\n'],
    ['unit separator', '\u001f'],
    ['delete', '\u007f'],
    ['C1 control', '\u009b'],
    ['last C1 control', '\u009f'],
  ])('rejects a %s character', (_name, value) => {
    expect(hasControlCharacter(value)).toBe(true);
  });

  it('accepts the first character after the C1 controls', () => {
    expect(hasControlCharacter('\u00a0')).toBe(false);
  });
});
