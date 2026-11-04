import { describe, expect, it } from 'vitest';

import quoteGitPath from './quoteGitPath.ts';

describe('quoteGitPath', () => {
  it.each(['a/src/index.ts', 'b/with space.txt', 'a/dash-under_score.1'])(
    'leaves %s as it is',
    (path) => {
      expect(quoteGitPath(path)).toBe(path);
    },
  );

  it.each([
    ['a/quo"te.txt', String.raw`"a/quo\"te.txt"`],
    ['a/back\\slash', String.raw`"a/back\\slash"`],
    ['a/tab\tx.txt', String.raw`"a/tab\tx.txt"`],
    ['a/new\nline', String.raw`"a/new\nline"`],
    ['a/café.txt', String.raw`"a/caf\303\251.txt"`],
    ['a/esc\u001b', String.raw`"a/esc\033"`],
    ['a/del\u007f', String.raw`"a/del\177"`],
  ])('quotes %j the way Git does', (path, quoted) => {
    expect(quoteGitPath(path)).toBe(quoted);
  });
});
