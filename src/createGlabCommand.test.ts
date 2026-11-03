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

  it('rejects any other argument with a pointer to the help', async () => {
    const { stdout, ctx } = recordCliContext();

    await expect(createGlabCommand()(['mr'], ctx)).rejects.toMatchObject({
      name: 'HunkExtensionUserError',
      message: 'Unknown GitLab command.',
      suggestions: ['Run `hunk glab --help` to list available commands.'],
    });
    expect(stdout).toEqual([]);
  });
});
