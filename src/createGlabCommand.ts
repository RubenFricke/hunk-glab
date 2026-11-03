import type { ExtensionCliCommandHandler } from 'hunkdiff/extension';

import type { PatchStore } from './createPatchStore.ts';
import GLAB_CLI_REFERENCE from './glabCliReference.ts';
import prepareMergeRequest, {
  type MergeRequestDependencies,
} from './prepareMergeRequest.ts';
import buildCancelledError from './utils/buildCancelledError.ts';
import buildUnknownCommandError from './utils/buildUnknownCommandError.ts';
import renderGlabHelp from './utils/renderGlabHelp.ts';

export interface GlabCommandDependencies extends MergeRequestDependencies {
  readonly patches: PatchStore;
}

/**
 * Builds the handler behind `hunk glab`.
 *
 * @param dependencies - The transport and the store for temporary patches.
 * @returns A handler that prints the help, hands a merge request to `hunk
 *   patch`, or rejects what it does not know.
 * @throws {HunkExtensionUserError} For a subcommand `hunk glab` does not have,
 *   an invalid invocation, a failed fetch or a cancelled run.
 */
const createGlabCommand = ({
  patches,
  ...dependencies
}: GlabCommandDependencies): ExtensionCliCommandHandler => {
  const help = renderGlabHelp(GLAB_CLI_REFERENCE);
  return async (args, ctx) => {
    const [command] = args;
    if (command === undefined || command === '--help' || command === '-h') {
      await ctx.stdout.write(help);
      return { kind: 'exit' };
    }
    if (command !== 'mr') {
      throw buildUnknownCommandError(command);
    }

    const prepared = await prepareMergeRequest({
      args: args.slice(1),
      ctx,
      dependencies,
    });
    if (ctx.signal.aborted) {
      throw buildCancelledError();
    }
    /** The patch stays until shutdown, so a review reload can read it again. */
    const patchPath = await patches.write(prepared.filename, prepared.bytes);
    const removeIfCancelled = async (): Promise<void> => {
      if (ctx.signal.aborted) {
        await patches.remove(patchPath);
        throw buildCancelledError();
      }
    };
    await removeIfCancelled();
    await ctx.stderr.write(
      `Opening ${prepared.bytes.byteLength.toLocaleString()} bytes in Hunk…\n`,
    );
    await removeIfCancelled();
    return {
      kind: 'delegate',
      argv: ['patch', patchPath, ...prepared.patchArgs],
    };
  };
};

export default createGlabCommand;
