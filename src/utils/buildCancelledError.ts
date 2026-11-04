import { HunkExtensionUserError } from 'hunkdiff/extension';

/**
 * Builds the error for a run the user cancelled.
 *
 * @returns The user error.
 */
const buildCancelledError = (): HunkExtensionUserError =>
  new HunkExtensionUserError('GitLab diff loading was cancelled.');

export default buildCancelledError;
