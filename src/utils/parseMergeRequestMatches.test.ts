import { describe, expect, it } from 'vitest';

import parseMergeRequestMatches from './parseMergeRequestMatches.ts';

const MATCH = {
  iid: 4307,
  state: 'opened',
  references: { full: 'gitlab-org/cli!4307' },
};
const MALFORMED = 'GitLab returned malformed merge-request matches.';

describe('parseMergeRequestMatches', () => {
  it('reads each match as a merge request of its target project', () => {
    expect(parseMergeRequestMatches([MATCH])).toEqual([
      { project: { kind: 'path', path: 'gitlab-org/cli' }, iid: 4307 },
    ]);
  });

  it('reads an empty list', () => {
    expect(parseMergeRequestMatches([])).toEqual([]);
  });

  it.each([
    ['not a list', { ...MATCH }],
    ['an entry that is not an object', [null]],
    ['no iid', [{ ...MATCH, iid: undefined }]],
    ['an iid that is not a positive integer', [{ ...MATCH, iid: 0 }]],
    ['no references', [{ ...MATCH, references: null }]],
    [
      'a reference without a project',
      [{ ...MATCH, references: { full: '!4307' } }],
    ],
    [
      'a reference by id',
      [{ ...MATCH, references: { full: '34675721!4307' } }],
    ],
    [
      'a reference to another number',
      [{ ...MATCH, references: { full: 'gitlab-org/cli!1' } }],
    ],
    [
      'a reference with control characters',
      [{ ...MATCH, references: { full: 'a/b\u001b!4307' } }],
    ],
  ])('rejects %s', (_name, value) => {
    expect(() => parseMergeRequestMatches(value)).toThrow(
      expect.objectContaining({ message: MALFORMED }),
    );
  });
});
