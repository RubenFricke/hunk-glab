import buildInvocationError from './buildInvocationError.ts';
import hasControlCharacter from './hasControlCharacter.ts';

/**
 * Rejects user input with terminal control characters before it can reach a
 * terminal-visible message.
 *
 * @param value - Text from the user.
 * @param label - What the text is, for the message.
 * @throws {HunkExtensionUserError} When the text has a control character.
 */
const assertSafeArgument = (value: string, label: string): void => {
  if (hasControlCharacter(value)) {
    throw buildInvocationError(`${label} cannot contain control characters.`);
  }
};

export default assertSafeArgument;
