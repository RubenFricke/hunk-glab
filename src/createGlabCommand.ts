import type { ExtensionCliCommandHandler } from 'hunkdiff/extension';

import type { PatchStore } from './createPatchStore.ts';
import GLAB_CLI_REFERENCE, {
  type GlabCliSubcommand,
} from './glabCliReference.ts';
import prepareCommit from './prepareCommit.ts';
import prepareMergeRequest, {
  type MergeRequestDependencies,
  type PreparedDiff,
  type PrepareDiffOptions,
} from './prepareMergeRequest.ts';
import buildCancelledError from './utils/buildCancelledError.ts';
import buildUnknownCommandError from './utils/buildUnknownCommandError.ts';
import hasHelpFlag from './utils/hasHelpFlag.ts';
import renderGlabHelp from './utils/renderGlabHelp.ts';
import renderSubcommandHelp from './utils/renderSubcommandHelp.ts';

interface GlabCommandDependencies extends MergeRequestDependencies {
  readonly patches: PatchStore;
}

/** How each subcommand fetches its diff; every described one must have one. */
const PREPARE_DIFF = {
  mr: prepareMergeRequest,
  commit: prepareCommit,
} as const satisfies Record<
  GlabCliSubcommand['name'],
  (options: PrepareDiffOptions) => Promise<PreparedDiff>
>;

/**
 * Builds the handler behind `hunk glab`.
 *
 * @param dependencies - The transport and the store for temporary patches.
 * @returns A handler that prints the help, hands the diff of a subcommand to
 *   `hunk patch`, or rejects what it does not know.
 * @throws {HunkExtensionUserError} For a subcommand `hunk glab` does not have,
 *   an invalid invocation, a failed fetch or a cancelled run.
 */
const createGlabCommand = ({
  patches,
  ...dependencies
}: GlabCommandDependencies): ExtensionCliCommandHandler => {
  const help = renderGlabHelp(GLAB_CLI_REFERENCE);
  /** A subcommand is known exactly when the reference describes it. */
  const subcommands: ReadonlyMap<
    string,
    {
      readonly help: string;
      readonly prepare: (options: PrepareDiffOptions) => Promise<PreparedDiff>;
    }
  > = new Map(
    GLAB_CLI_REFERENCE.subcommands.map((subcommand) => [
      subcommand.name,
      {
        help: renderSubcommandHelp(subcommand, GLAB_CLI_REFERENCE),
        prepare: PREPARE_DIFF[subcommand.name],
      },
    ]),
  );
  return async (args, ctx) => {
    const [command, ...commandArgs] = args;
    if (command === undefined || command === '--help' || command === '-h') {
      await ctx.stdout.write(help);
      return { kind: 'exit' };
    }
    const subcommand = subcommands.get(command);
    if (subcommand === undefined) {
      throw buildUnknownCommandError(command);
    }
    if (hasHelpFlag(commandArgs)) {
      await ctx.stdout.write(subcommand.help);
      return { kind: 'exit' };
    }

    const prepared = await subcommand.prepare({
      args: commandArgs,
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
      review: prepared.review,
    };
  };
};

export default createGlabCommand;
