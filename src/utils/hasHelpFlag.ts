/**
 * Checks the arguments of a subcommand for `--help` or `-h`. Only the tokens
 * before the first `--` count; the rest belongs to `hunk patch`.
 *
 * @param args - The tokens after `hunk glab <command>`.
 * @returns True when the user asked for help.
 */
const hasHelpFlag = (args: readonly string[]): boolean => {
  const separator = args.indexOf('--');
  const ownedArgs = separator < 0 ? args : args.slice(0, separator);
  return ownedArgs.includes('--help') || ownedArgs.includes('-h');
};

export default hasHelpFlag;
