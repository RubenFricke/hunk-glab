import { HunkExtensionUserError } from 'hunkdiff/extension';
import { describe, expect, it } from 'vitest';

import buildUnknownCommandError from './buildUnknownCommandError.ts';

const LIST_COMMANDS = 'Run `hunk glab --help` to list available commands.';

describe('buildUnknownCommandError', () => {
  it('names the unknown command and points at the help', () => {
    const error = buildUnknownCommandError('foo');

    expect(error).toBeInstanceOf(HunkExtensionUserError);
    expect(error).toMatchObject({
      message: 'Unknown GitLab command: foo',
      suggestions: [LIST_COMMANDS],
    });
  });

  it('points a GitHub habit at merge requests', () => {
    expect(buildUnknownCommandError('pr')).toMatchObject({
      message: 'Unknown GitLab command: pr',
      suggestions: ['GitLab calls these merge requests: run `hunk glab mr`.'],
    });
  });

  it('rejects control characters without echoing them', () => {
    const error = buildUnknownCommandError('\u001b]0;owned\u0007mr');

    expect(error).toMatchObject({
      message: 'GitLab command cannot contain control characters.',
      suggestions: [LIST_COMMANDS],
    });
    expect(error.message).not.toContain('owned');
  });
});
