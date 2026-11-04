import { describe, expect, it } from 'vitest';

import splitSubcommandArgs from './splitSubcommandArgs.ts';

const COMMIT = {
  command: 'commit',
  subject: 'commit',
  optionLabel: 'Commit option',
} as const;

describe('splitSubcommandArgs', () => {
  it('splits the target, --repo and the patch options', () => {
    expect(
      splitSubcommandArgs(
        ['--repo', 'a/b', 'abcdef1', '--', '--mode', 'unified', '--repo'],
        COMMIT,
      ),
    ).toEqual({
      target: 'abcdef1',
      repo: 'a/b',
      patchArgs: ['--mode', 'unified', '--repo'],
    });
  });

  it('reads --repo=value and leaves out what was not given', () => {
    expect(splitSubcommandArgs(['--repo=a/b'], COMMIT)).toEqual({
      repo: 'a/b',
      patchArgs: [],
    });
  });

  it.each([
    [['1', '2'], 'Specify exactly one commit.'],
    [['--repo', 'a/b', '--repo=a/b'], 'Specify --repo only once.'],
    [['--repo'], '`--repo` requires a group/project value.'],
    [['--repo', '--', 'x'], '`--repo` requires a group/project value.'],
    [['-x'], 'Unknown commit option: -x'],
  ])('rejects %j', (args, message) => {
    expect(() => splitSubcommandArgs(args, COMMIT)).toThrow(
      expect.objectContaining({ message }),
    );
  });

  it('rejects an option with control characters without echoing it', () => {
    expect(() => splitSubcommandArgs(['--\u001b[2J'], COMMIT)).toThrow(
      expect.objectContaining({
        message: 'Commit option cannot contain control characters.',
      }),
    );
  });
});
