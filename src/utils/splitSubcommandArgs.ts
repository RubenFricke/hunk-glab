import assertSafeArgument from './assertSafeArgument.ts';
import buildInvocationError from './buildInvocationError.ts';

const REPO_OPTION = '--repo';
const REPO_PREFIX = '--repo=';

interface SplitSubcommandArgsOptions {
  /** The subcommand, for `Unknown <command> option`. */
  readonly command: string;
  /** What the target names, for `Specify exactly one <subject>`. */
  readonly subject: string;
  /** What an option is called in the control-character message. */
  readonly optionLabel: string;
}

/** The tokens of one subcommand, before they are read. */
interface SubcommandArgs {
  readonly target?: string;
  readonly repo?: string;
  /** Everything after the first `--`, for `hunk patch`. */
  readonly patchArgs: readonly string[];
}

/**
 * Splits the arguments of a `hunk glab` subcommand into its one target, its
 * `--repo` and the options for `hunk patch`. Only the tokens before the first
 * `--` belong to the extension.
 *
 * @param args - The tokens after `hunk glab <command>`.
 * @param options - The names used in the messages.
 * @returns The parts, still as text.
 * @throws {HunkExtensionUserError} For a second target, a second or empty
 *   `--repo`, or an unknown option.
 */
const splitSubcommandArgs = (
  args: readonly string[],
  { command, subject, optionLabel }: SplitSubcommandArgsOptions,
): SubcommandArgs => {
  const separator = args.indexOf('--');
  const ownedArgs = separator < 0 ? args : args.slice(0, separator);
  const patchArgs = separator < 0 ? [] : args.slice(separator + 1);

  let target: string | undefined;
  let repo: string | undefined;
  const takeRepo = (value: string | undefined): void => {
    if (repo !== undefined) {
      throw buildInvocationError('Specify --repo only once.');
    }
    if (!value || value.startsWith('--')) {
      throw buildInvocationError('`--repo` requires a group/project value.');
    }
    repo = value;
  };
  for (let index = 0; index < ownedArgs.length; index += 1) {
    const token = ownedArgs[index] ?? '';
    if (token === REPO_OPTION) {
      takeRepo(ownedArgs[index + 1]);
      index += 1;
      continue;
    }
    if (token.startsWith(REPO_PREFIX)) {
      takeRepo(token.slice(REPO_PREFIX.length));
      continue;
    }
    if (token.startsWith('-')) {
      assertSafeArgument(token, optionLabel);
      throw buildInvocationError(`Unknown ${command} option: ${token}`);
    }
    if (target !== undefined) {
      throw buildInvocationError(`Specify exactly one ${subject}.`);
    }
    target = token;
  }

  return {
    ...(target === undefined ? {} : { target }),
    ...(repo === undefined ? {} : { repo }),
    patchArgs: Object.freeze([...patchArgs]),
  };
};

export default splitSubcommandArgs;
