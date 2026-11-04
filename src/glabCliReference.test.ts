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
      usage: 'mr [merge-request] [--repo <group/project>]',
      description:
        'Review GitLab merge requests in Hunk without requiring the glab CLI.',
    });
  });

  it('describes the shared options and the tokens', () => {
    expect(GLAB_CLI_REFERENCE.options.map(({ flag }) => flag)).toEqual([
      '--repo <group/project>',
      '-- <patch-options...>',
    ]);
    expect(GLAB_CLI_REFERENCE.authentication.variables).toEqual([
      'GITLAB_TOKEN',
      'GITLAB_ACCESS_TOKEN',
    ]);
  });

  it('describes hunk glab mr with its forms', () => {
    const [mr] = GLAB_CLI_REFERENCE.subcommands;

    expect(GLAB_CLI_REFERENCE.subcommands).toHaveLength(1);
    expect(mr?.name).toBe('mr');
    expect(mr?.forms.map(({ args }) => args)).toEqual([
      '',
      '123',
      "'!123'",
      '123 --repo gitlab-org/cli',
      '123 --repo 34675721',
      "'gitlab-org/cli!123'",
      'https://gitlab.com/gitlab-org/cli/-/merge_requests/123',
    ]);
  });
});
