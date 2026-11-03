import { describe, expect, it } from 'vitest';

import createGlabCommand from './createGlabCommand.ts';
import GLAB_CLI_REFERENCE from './glabCliReference.ts';
import recordCliContext from '../test/recordCliContext.ts';
import renderGlabHelp from './utils/renderGlabHelp.ts';

describe('createGlabCommand', () => {
  it.each([[[]], [['--help']], [['-h']]])(
    'prints the overview help for %j and exits',
    async (args) => {
      const { stdout, stderr, ctx } = recordCliContext();

      const result = await createGlabCommand()(args, ctx);

      expect(result).toEqual({ kind: 'exit' });
      expect(stdout.join('')).toBe(renderGlabHelp(GLAB_CLI_REFERENCE));
      expect(stderr).toEqual([]);
    },
  );

  it('names an unknown command and prints nothing', async () => {
    const { stdout, ctx } = recordCliContext();

    await expect(createGlabCommand()(['foo', '1'], ctx)).rejects.toMatchObject({
      name: 'HunkExtensionUserError',
      message: 'Unknown GitLab command: foo',
      suggestions: ['Run `hunk glab --help` to list available commands.'],
    });
    expect(stdout).toEqual([]);
  });

  it('points `hunk glab pr` at merge requests', async () => {
    const { ctx } = recordCliContext();

    await expect(createGlabCommand()(['pr', '1'], ctx)).rejects.toMatchObject({
      message: 'Unknown GitLab command: pr',
      suggestions: ['GitLab calls these merge requests: run `hunk glab mr`.'],
    });
  });

  it('rejects a command with control characters', async () => {
    const { ctx } = recordCliContext();

    await expect(
      createGlabCommand()(['\u001b[2Jmr'], ctx),
    ).rejects.toMatchObject({
      message: 'GitLab command cannot contain control characters.',
    });
  });
});
