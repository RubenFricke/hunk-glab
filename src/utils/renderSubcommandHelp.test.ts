import { describe, expect, it } from 'vitest';

import GLAB_CLI_REFERENCE from '../glabCliReference.ts';
import renderSubcommandHelp from './renderSubcommandHelp.ts';

describe('renderSubcommandHelp', () => {
  it('renders the help of hunk glab mr', () => {
    const [mr] = GLAB_CLI_REFERENCE.subcommands;
    if (mr === undefined) {
      throw new Error('Expected the mr subcommand.');
    }

    expect(renderSubcommandHelp(mr, GLAB_CLI_REFERENCE)).toBe(
      [
        'Usage: hunk glab mr <merge-request> [--repo <group/project>] [-- <patch-options...>]',
        '',
        'Review a GitLab merge request without requiring the glab CLI.',
        '',
        'Merge request forms:',
        '  123                                  infer the project from the local origin',
        "  '!123'                               use GitLab's own reference",
        '  123 --repo gitlab-org/cli            use an explicit project',
        '  123 --repo 34675721                  use a numeric project id',
        '',
        'Quote `!123`, because shells expand `!` from their history.',
        'Pass Hunk patch options after `--`.',
        '',
        'Authentication:',
        '  GITLAB_TOKEN, then GITLAB_ACCESS_TOKEN optional for public projects; needs read_api',
        '',
      ].join('\n'),
    );
  });

  it('leaves out the notes block when there are no notes', () => {
    const help = renderSubcommandHelp(
      {
        name: 'mr',
        arguments: '<merge-request>',
        summary: 'Review.',
        description: 'Review a merge request.',
        formsHeading: 'Forms',
        forms: [{ args: '1' }],
      },
      GLAB_CLI_REFERENCE,
    );

    expect(help).toContain('Forms:\n  1\n\nAuthentication:');
  });
});
