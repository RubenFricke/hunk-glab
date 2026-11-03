import { describe, expect, it } from 'vitest';

import GLAB_CLI_REFERENCE from './glabCliReference.ts';

/** Hunk only lets an extension claim a lowercase kebab-case command. */
const EXTENSION_COMMAND_NAME = /^[a-z][a-z0-9-]*$/;

describe('GLAB_CLI_REFERENCE', () => {
  it('claims the glab command', () => {
    expect(GLAB_CLI_REFERENCE.name).toBe('glab');
    expect(GLAB_CLI_REFERENCE.name).toMatch(EXTENSION_COMMAND_NAME);
  });

  it('describes the command for discovery and help', () => {
    expect(GLAB_CLI_REFERENCE).toMatchObject({
      summary: 'Review GitLab merge requests',
      usage: '<command>',
      description:
        'Review GitLab merge requests in Hunk without requiring the glab CLI.',
    });
  });
});
