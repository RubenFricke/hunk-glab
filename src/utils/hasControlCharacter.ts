const LAST_C0_CONTROL = 0x1f;
const FIRST_C1_CONTROL = 0x7f;
const LAST_C1_CONTROL = 0x9f;

/**
 * Checks text for terminal control characters, so user input never reaches a
 * terminal-visible message with them.
 *
 * @param value - Text from the user.
 * @returns True when the text contains a C0 or C1 control character.
 */
const hasControlCharacter = (value: string): boolean => {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (
      codePoint <= LAST_C0_CONTROL ||
      (codePoint >= FIRST_C1_CONTROL && codePoint <= LAST_C1_CONTROL)
    ) {
      return true;
    }
  }
  return false;
};

export default hasControlCharacter;
