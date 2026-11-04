/** The column the descriptions start after, the way `hunk gh` lays them out. */
const DEFAULT_TERM_WIDTH = 37;

/**
 * Formats one indented row of a help screen.
 *
 * @param term - The form or flag.
 * @param description - What it does; left out for a term that speaks for
 *   itself.
 * @param width - The width of the term column, indent included.
 * @returns The row.
 */
const formatHelpRow = (
  term: string,
  description?: string,
  width = DEFAULT_TERM_WIDTH,
): string =>
  description === undefined
    ? `  ${term}`
    : `  ${term.padEnd(width - 1)} ${description}`;

export default formatHelpRow;
