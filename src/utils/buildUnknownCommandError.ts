import { HunkExtensionUserError } from 'hunkdiff/extension';

import hasControlCharacter from './hasControlCharacter.ts';

const LIST_COMMANDS = 'Run `hunk glab --help` to list available commands.';
/** `pr` is what a `hunk gh` user types first; GitLab's word for it is `mr`. */
const USE_MR = 'GitLab calls these merge requests: run `hunk glab mr`.';

/**
 * Builds the error for a subcommand `hunk glab` does not have.
 *
 * @param command - The subcommand as the user typed it.
 * @returns A user error that never echoes terminal control characters.
 */
const buildUnknownCommandError = (command: string): HunkExtensionUserError => {
  if (hasControlCharacter(command)) {
    return new HunkExtensionUserError(
      'GitLab command cannot contain control characters.',
      { suggestions: [LIST_COMMANDS] },
    );
  }

  return new HunkExtensionUserError(`Unknown GitLab command: ${command}`, {
    suggestions: [command === 'pr' ? USE_MR : LIST_COMMANDS],
  });
};

export default buildUnknownCommandError;
