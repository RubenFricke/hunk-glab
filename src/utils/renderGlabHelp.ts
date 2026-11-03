import type { GlabCliReference } from '../glabCliReference.ts';

/**
 * Renders the `hunk glab --help` overview, in the layout of `hunk gh --help`.
 *
 * @param reference - The description of the command.
 * @returns The help text, ending in a newline.
 */
const renderGlabHelp = (reference: GlabCliReference): string =>
  [
    `Usage: hunk ${reference.name} ${reference.usage}`,
    '',
    reference.description,
    '',
    `Run \`hunk ${reference.name} <command> --help\` for command-specific help.`,
    '',
  ].join('\n');

export default renderGlabHelp;
