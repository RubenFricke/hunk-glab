import { describe, expect, it } from 'vitest';

import GLAB_CLI_REFERENCE from '../glabCliReference.ts';
import renderGlabHelp from './renderGlabHelp.ts';

describe('renderGlabHelp', () => {
  it('renders the usage, the description and the pointer to command help', () => {
    expect(
      renderGlabHelp({
        ...GLAB_CLI_REFERENCE,
        name: 'glab',
        summary: 'Review GitLab merge requests',
        usage: '<command>',
        description: 'Review GitLab merge requests in Hunk.',
      }),
    ).toBe(
      [
        'Usage: hunk glab <command>',
        '',
        'Review GitLab merge requests in Hunk.',
        '',
        'Run `hunk glab <command> --help` for command-specific help.',
        '',
      ].join('\n'),
    );
  });
});
