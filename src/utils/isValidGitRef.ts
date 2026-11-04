import hasControlCharacter from './hasControlCharacter.ts';

const MAX_REF_BYTES = 1024;
const INVALID_REF_CHARACTERS = [' ', '~', '^', ':', '?', '*', '[', '\\'];

/**
 * Checks a ref against Git's ref-name rules before it reaches a GitLab URL, the
 * way `hunk gh compare` checks it.
 *
 * @param value - A branch, tag or SHA as the user typed it.
 * @returns True when Git would accept it as a ref name.
 */
const isValidGitRef = (value: string): boolean => {
  if (
    !value ||
    value === '@' ||
    new TextEncoder().encode(value).byteLength > MAX_REF_BYTES ||
    value.startsWith('/') ||
    value.endsWith('/') ||
    value.endsWith('.') ||
    value.includes('//') ||
    value.includes('..') ||
    value.includes('@{') ||
    hasControlCharacter(value) ||
    INVALID_REF_CHARACTERS.some((character) => value.includes(character))
  ) {
    return false;
  }
  return value
    .split('/')
    .every((part) => !part.startsWith('.') && !part.endsWith('.lock'));
};

export default isValidGitRef;
