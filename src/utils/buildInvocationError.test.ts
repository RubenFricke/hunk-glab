import { HunkExtensionUserError } from 'hunkdiff/extension';
import { describe, expect, it } from 'vitest';

import buildInvocationError from './buildInvocationError.ts';

describe('buildInvocationError', () => {
  it('attaches the accepted merge-request forms', () => {
    const error = buildInvocationError('Specify exactly one merge request.');

    expect(error).toBeInstanceOf(HunkExtensionUserError);
    expect(error).toMatchObject({
      message: 'Specify exactly one merge request.',
      suggestions: [
        'Run `hunk glab mr --help` for accepted merge-request forms.',
        'Use `hunk glab mr 123 --repo group/project` outside a GitLab checkout.',
      ],
    });
  });
});
