import { describe, expect, it } from 'vitest';

import buildPatch from './buildPatch.ts';

const HUNK = '@@ -1 +1 @@\n-a\n+b\n';

/** One file as GitLab's diff API returns it. */
const file = (fields: Record<string, unknown>): Record<string, unknown> => ({
  old_path: 'src/a.ts',
  new_path: 'src/a.ts',
  a_mode: '100644',
  b_mode: '100644',
  new_file: false,
  renamed_file: false,
  deleted_file: false,
  collapsed: false,
  too_large: false,
  diff: HUNK,
  ...fields,
});

const MALFORMED = 'GitLab returned malformed diff data.';

describe('buildPatch', () => {
  it('writes a changed file', () => {
    expect(buildPatch([file({})])).toBe(
      'diff --git a/src/a.ts b/src/a.ts\n--- a/src/a.ts\n+++ b/src/a.ts\n' +
        HUNK,
    );
  });

  it('writes a new and a deleted file', () => {
    expect(
      buildPatch([
        file({ new_file: true, a_mode: '0', diff: '@@ -0,0 +1 @@\n+b\n' }),
        file({ deleted_file: true, b_mode: '0', diff: '@@ -1 +0,0 @@\n-a\n' }),
      ]),
    ).toBe(
      [
        'diff --git a/src/a.ts b/src/a.ts',
        'new file mode 100644',
        '--- /dev/null',
        '+++ b/src/a.ts',
        '@@ -0,0 +1 @@',
        '+b',
        'diff --git a/src/a.ts b/src/a.ts',
        'deleted file mode 100644',
        '--- a/src/a.ts',
        '+++ /dev/null',
        '@@ -1 +0,0 @@',
        '-a',
        '',
      ].join('\n'),
    );
  });

  it('writes a rename and a mode change without content', () => {
    expect(
      buildPatch([
        file({ new_path: 'src/b.ts', renamed_file: true, diff: '' }),
        file({ b_mode: '100755', diff: '' }),
      ]),
    ).toBe(
      [
        'diff --git a/src/a.ts b/src/b.ts',
        'rename from src/a.ts',
        'rename to src/b.ts',
        'diff --git a/src/a.ts b/src/a.ts',
        'old mode 100644',
        'new mode 100755',
        '',
      ].join('\n'),
    );
  });

  it('marks a changed file without hunks as binary', () => {
    expect(
      buildPatch([file({ old_path: 'i.png', new_path: 'i.png', diff: '' })]),
    ).toBe(
      'diff --git a/i.png b/i.png\nBinary files a/i.png and b/i.png differ\n',
    );
  });

  it('ends a hunk without a final newline with one', () => {
    expect(buildPatch([file({ diff: '@@ -1 +1 @@\n-a\n+b' })])).toMatch(
      /\+b\n$/,
    );
  });

  it('quotes paths like Git, with a tab after a path with a space', () => {
    expect(
      buildPatch([
        file({ old_path: 'with space.txt', new_path: 'with space.txt' }),
        file({ old_path: 'café.txt', new_path: 'café.txt' }),
      ]),
    ).toBe(
      [
        'diff --git a/with space.txt b/with space.txt',
        '--- a/with space.txt\t',
        '+++ b/with space.txt\t',
        '@@ -1 +1 @@',
        '-a',
        '+b',
        String.raw`diff --git "a/caf\303\251.txt" "b/caf\303\251.txt"`,
        String.raw`--- "a/caf\303\251.txt"`,
        String.raw`+++ "b/caf\303\251.txt"`,
        '@@ -1 +1 @@',
        '-a',
        '+b',
        '',
      ].join('\n'),
    );
  });

  it('writes nothing for no files', () => {
    expect(buildPatch([])).toBe('');
  });

  it.each([
    ['collapsed', { collapsed: true }],
    ['too large', { too_large: true }],
  ])('refuses a file GitLab left out as %s', (_name, fields) => {
    expect(() =>
      buildPatch([file({ new_path: 'big\u001b.ts', ...fields })]),
    ).toThrow(
      expect.objectContaining({
        message: String.raw`GitLab left out the diff of "b/big\033.ts", so the review would be incomplete.`,
      }),
    );
  });

  it.each([
    ['not a list', {}],
    ['an entry that is not an object', [null]],
    ['no path', [file({ new_path: '' })]],
    ['a mode that is not octal', [file({ a_mode: '10064x' })]],
    ['a flag that is not a boolean', [file({ new_file: 'yes' })]],
    ['a diff that is not text', [file({ diff: null })]],
  ])('rejects %s', (_name, value) => {
    expect(() => buildPatch(value)).toThrow(
      expect.objectContaining({ message: MALFORMED }),
    );
  });
});
