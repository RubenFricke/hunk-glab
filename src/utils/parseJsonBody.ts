import { HunkExtensionUserError } from 'hunkdiff/extension';

/**
 * Parses a response body as strict UTF-8 JSON.
 *
 * @param bytes - The body.
 * @param malformedMessage - The message when the body is not valid JSON.
 * @returns The parsed value, to be checked by the caller.
 * @throws {HunkExtensionUserError} When the body is not UTF-8 or not JSON.
 */
const parseJsonBody = (
  bytes: Uint8Array,
  malformedMessage: string,
): unknown => {
  try {
    return JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    ) as unknown;
  } catch {
    throw new HunkExtensionUserError(malformedMessage);
  }
};

export default parseJsonBody;
