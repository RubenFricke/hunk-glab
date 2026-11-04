import type {
  GlabCliReference,
  GlabCliSubcommand,
} from '../glabCliReference.ts';
import formatHelpRow from './formatHelpRow.ts';
import formatSubcommandUsage from './formatSubcommandUsage.ts';
import renderAuthenticationHelp from './renderAuthenticationHelp.ts';

/**
 * Renders `hunk glab <command> --help`, in the layout of `hunk gh pr --help`.
 *
 * @param subcommand - The subcommand.
 * @param reference - The description of `hunk glab`.
 * @returns The help text, ending in a newline.
 */
const renderSubcommandHelp = (
  subcommand: GlabCliSubcommand,
  reference: GlabCliReference,
): string =>
  [
    `Usage: hunk ${reference.name} ${formatSubcommandUsage(subcommand, reference)}`,
    '',
    subcommand.description,
    '',
    `${subcommand.formsHeading}:`,
    ...subcommand.forms.map(({ args, description }) =>
      formatHelpRow(args || '(omitted)', description),
    ),
    ...(subcommand.notes ? ['', ...subcommand.notes] : []),
    '',
    ...renderAuthenticationHelp(reference),
    '',
  ].join('\n');

export default renderSubcommandHelp;
