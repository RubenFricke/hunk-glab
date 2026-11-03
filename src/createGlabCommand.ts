import type { ExtensionCliCommandHandler } from 'hunkdiff/extension';

import GLAB_CLI_REFERENCE from './glabCliReference.ts';
import buildUnknownCommandError from './utils/buildUnknownCommandError.ts';
import renderGlabHelp from './utils/renderGlabHelp.ts';

/**
 * Builds the handler behind `hunk glab`.
 *
 * @returns A handler that prints the help, or rejects what it does not know.
 * @throws {HunkExtensionUserError} For a subcommand `hunk glab` does not have.
 */
const createGlabCommand = (): ExtensionCliCommandHandler => {
  const help = renderGlabHelp(GLAB_CLI_REFERENCE);
  return async (args, ctx) => {
    const [command] = args;
    if (command === undefined || command === '--help' || command === '-h') {
      await ctx.stdout.write(help);
      return { kind: 'exit' };
    }

    throw buildUnknownCommandError(command);
  };
};

export default createGlabCommand;
