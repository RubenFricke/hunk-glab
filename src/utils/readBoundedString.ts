import hasControlCharacter from './hasControlCharacter.ts';
import isRecord from './isRecord.ts';

/**
 * Reads one text field of GitLab metadata that reaches the terminal: it must be
 * non-empty, free of control characters and within a byte limit.
 *
 * @param container - The parsed JSON object that holds the field.
 * @param field - The name of the field.
 * @param maxBytes - The largest UTF-8 size the field may have.
 * @returns The text, or undefined when the field does not qualify.
 */
const readBoundedString = (
  container: unknown,
  field: string,
  maxBytes: number,
): string | undefined => {
  const text = isRecord(container) ? container[field] : undefined;
  return typeof text === 'string' &&
    text.length > 0 &&
    !hasControlCharacter(text) &&
    new TextEncoder().encode(text).byteLength <= maxBytes
    ? text
    : undefined;
};

export default readBoundedString;
