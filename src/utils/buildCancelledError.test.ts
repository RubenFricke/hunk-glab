import { HunkExtensionUserError } from 'hunkdiff/extension';
import { describe, expect, it } from 'vitest';

import buildCancelledError from './buildCancelledError.ts';

describe('buildCancelledError', () => {
  it('says the loading was cancelled', () => {
    const error = buildCancelledError();

    expect(error).toBeInstanceOf(HunkExtensionUserError);
    expect(error.message).toBe('GitLab diff loading was cancelled.');
  });
});
