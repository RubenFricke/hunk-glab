import type { GlabCliReference } from '../glabCliReference.ts';
import formatHelpRow from './formatHelpRow.ts';
import formatSubcommandUsage from './formatSubcommandUsage.ts';
import renderAuthenticationHelp from './renderAuthenticationHelp.ts';

/** The options column is narrower than the forms column, as in `hunk gh`. */
const OPTION_WIDTH = 24;

/**
 * Renders the `hunk glab --help` overview, in the layout of `hunk gh --help`.
 *
 * @param reference - The description of the command.
 * @returns The help text, ending in a newline.
 */
const renderGlabHelp = (reference: GlabCliReference): string =>
  [
    `Usage: hunk ${reference.name} <command>`,
    '',
    reference.description,
    '',
    'GitLab commands:',
    ...reference.subcommands.flatMap((subcommand) => [
      `  ${formatSubcommandUsage(subcommand, reference)}`,
      `      ${subcommand.summary}`,
    ]),
    '',
    'Options:',
    ...reference.options.map(({ flag, description }) =>
      formatHelpRow(flag, description, OPTION_WIDTH),
    ),
    '',
    ...renderAuthenticationHelp(reference),
    '',
    `Run \`hunk ${reference.name} <command> --help\` for command-specific help.`,
    '',
  ].join('\n');

export default renderGlabHelp;
