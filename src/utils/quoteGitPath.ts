/** The escapes Git writes by name; every other unsafe byte becomes octal. */
const NAMED_ESCAPES: Readonly<Record<number, string>> = {
  0x07: '\\a',
  0x08: '\\b',
  0x09: '\\t',
  0x0a: '\\n',
  0x0b: '\\v',
  0x0c: '\\f',
  0x0d: '\\r',
  0x22: '\\"',
  0x5c: '\\\\',
};
const LAST_CONTROL_BYTE = 0x1f;
const DELETE_BYTE = 0x7f;

/**
 * Quotes a path the way `git diff` does with `core.quotePath`: quotes,
 * backslashes, control characters and non-ASCII bytes are escaped, and the
 * whole path is put in double quotes. A path that needs none of that stays as
 * it is. So no control character from a path reaches the patch.
 *
 * @param path - The path, with its `a/` or `b/` prefix when it has one.
 * @returns The path as Git writes it in a patch.
 */
const quoteGitPath = (path: string): string => {
  let quoted = '';
  let needsQuotes = false;
  for (const byte of new TextEncoder().encode(path)) {
    const named = NAMED_ESCAPES[byte];
    if (named !== undefined) {
      quoted += named;
      needsQuotes = true;
    } else if (byte <= LAST_CONTROL_BYTE || byte >= DELETE_BYTE) {
      quoted += `\\${byte.toString(8).padStart(3, '0')}`;
      needsQuotes = true;
    } else {
      quoted += String.fromCharCode(byte);
    }
  }
  return needsQuotes ? `"${quoted}"` : path;
};

export default quoteGitPath;
