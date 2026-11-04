import { describe, expect, it } from 'vitest';

import parseCommitInvocation from './parseCommitInvocation.ts';

describe('parseCommitInvocation', () => {
  it.each(['d7e533e', 'D7E533EE212A48942CFD8544188BB15F46630F32'])(
    'reads the SHA %s in lowercase',
    (sha) => {
      expect(parseCommitInvocation([sha, '--', '-x', '4'])).toEqual({
        sha: sha.toLowerCase(),
        patchArgs: ['-x', '4'],
      });
    },
  );

  it('reads --repo as the project', () => {
    expect(parseCommitInvocation(['d7e533e', '--repo', '34675721'])).toEqual({
      sha: 'd7e533e',
      project: { kind: 'id', id: 34675721 },
      patchArgs: [],
    });
  });

  it.each([
    [[], 'Specify one GitLab commit.'],
    [['abc123'], 'Invalid GitLab commit locator: abc123'],
    [['main'], 'Invalid GitLab commit locator: main'],
    [['a'.repeat(41)], `Invalid GitLab commit locator: ${'a'.repeat(41)}`],
    [['d7e533e', 'd7e533f'], 'Specify exactly one commit.'],
    [['d7e533e', '--draft'], 'Unknown commit option: --draft'],
  ])('rejects %j', (args, message) => {
    expect(() => parseCommitInvocation(args)).toThrow(
      expect.objectContaining({ message }),
    );
  });

  it('rejects control characters without echoing them', () => {
    expect(() => parseCommitInvocation(['d7e533e\u001b[2J'])).toThrow(
      expect.objectContaining({
        message: 'Commit locator cannot contain control characters.',
      }),
    );
  });
});
