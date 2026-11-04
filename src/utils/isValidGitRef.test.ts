import { describe, expect, it } from 'vitest';

import isValidGitRef from './isValidGitRef.ts';

describe('isValidGitRef', () => {
  it.each(['main', 'feature/x', 'v1.127.0', 'd7e533e', 'release-2026.11', 'ü'])(
    'accepts %s',
    (ref) => {
      expect(isValidGitRef(ref)).toBe(true);
    },
  );

  it.each([
    '',
    '@',
    '/main',
    'main/',
    'main.',
    'a//b',
    'a..b',
    'a@{1}',
    'a b',
    'a~1',
    'a^',
    'a:b',
    'a?',
    'a*',
    'a[b',
    'a\\b',
    'a\u001b',
    '.hidden',
    'a/.b',
    'a.lock',
    'a/b.lock/c',
    'x'.repeat(1025),
  ])('rejects %j', (ref) => {
    expect(isValidGitRef(ref)).toBe(false);
  });

  it('counts the 1,024-byte limit in UTF-8 bytes', () => {
    expect(isValidGitRef('é'.repeat(512))).toBe(true);
    expect(isValidGitRef(`${'é'.repeat(512)}x`)).toBe(false);
  });
});
