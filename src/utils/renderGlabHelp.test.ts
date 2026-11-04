import { describe, expect, it } from 'vitest';

import GLAB_CLI_REFERENCE from '../glabCliReference.ts';
import renderGlabHelp from './renderGlabHelp.ts';

describe('renderGlabHelp', () => {
  it('lists the commands, the options and the tokens', () => {
    expect(renderGlabHelp(GLAB_CLI_REFERENCE)).toBe(
      [
        'Usage: hunk glab <command>',
        '',
        'Review GitLab merge requests in Hunk without requiring the glab CLI.',
        '',
        'GitLab commands:',
        '  mr [merge-request] [--repo <group/project>] [-- <patch-options...>]',
        '      Review a GitLab merge request; infer it from the current branch when omitted.',
        '  commit <commit> [--repo <group/project>] [-- <patch-options...>]',
        '      Review a GitLab commit without requiring the glab CLI.',
        '',
        'Options:',
        '  --repo <group/project>  use an explicit project path or id instead of the origin',
        '  -- <patch-options...>   pass the remaining options to the `hunk patch` review',
        '',
        'Authentication:',
        '  GITLAB_TOKEN, then GITLAB_ACCESS_TOKEN optional for public projects; needs read_api',
        '',
        'Run `hunk glab <command> --help` for command-specific help.',
        '',
      ].join('\n'),
    );
  });
});
