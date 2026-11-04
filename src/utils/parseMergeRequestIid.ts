import assertSafeArgument from './assertSafeArgument.ts';
import buildInvocationError from './buildInvocationError.ts';

/** GitLab's own reference to a merge request is `!123`. */
const MERGE_REQUEST_IID = /^!?([1-9]\d*)$/;

/**
 * Reads the project-local number of a merge request.
 *
 * @param value - `123` or `!123`, as the user typed it.
 * @returns The merge-request IID.
 * @throws {HunkExtensionUserError} When the value is not a positive safe
 *   integer.
 */
const parseMergeRequestIid = (value: string): number => {
  assertSafeArgument(value, 'Merge-request number');
  const digits = MERGE_REQUEST_IID.exec(value)?.[1];
  if (digits === undefined) {
    throw buildInvocationError(`Invalid merge-request number: ${value}`);
  }

  const iid = Number(digits);
  if (!Number.isSafeInteger(iid)) {
    throw buildInvocationError(`Merge-request number is too large: ${value}`);
  }
  return iid;
};

export default parseMergeRequestIid;
