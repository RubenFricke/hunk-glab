import type {
  GlabCliReference,
  GlabCliSubcommand,
} from '../glabCliReference.ts';

/**
 * Formats the usage of one subcommand after `hunk glab`, shared options
 * included.
 *
 * @param subcommand - The subcommand.
 * @param reference - The description of `hunk glab`, for the shared options.
 * @returns `mr <merge-request> [--repo …] [-- …]`.
 */
const formatSubcommandUsage = (
  subcommand: GlabCliSubcommand,
  reference: GlabCliReference,
): string =>
  [
    subcommand.name,
    subcommand.arguments,
    ...reference.options.map(({ flag }) => `[${flag}]`),
  ].join(' ');

export default formatSubcommandUsage;
