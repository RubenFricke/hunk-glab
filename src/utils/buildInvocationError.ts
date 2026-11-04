import { HunkExtensionUserError } from 'hunkdiff/extension';

/**
 * Builds a user error for a malformed `hunk glab mr` invocation, with the
 * accepted forms attached.
 *
 * @param message - What is wrong with the invocation.
 * @returns The user error.
 */
const buildInvocationError = (message: string): HunkExtensionUserError =>
  new HunkExtensionUserError(message, {
    suggestions: [
      'Run `hunk glab mr --help` for accepted merge-request forms.',
      'Use `hunk glab mr 123 --repo group/project` outside a GitLab checkout.',
    ],
  });

export default buildInvocationError;
