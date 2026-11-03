import type { GlabCliReference } from '../glabCliReference.ts';
import formatHelpRow from './formatHelpRow.ts';

/**
 * Renders the authentication block every help screen ends with.
 *
 * @param reference - The description of `hunk glab`.
 * @returns The lines of the block.
 */
const renderAuthenticationHelp = ({
  authentication,
}: GlabCliReference): string[] => [
  'Authentication:',
  formatHelpRow(
    authentication.variables.join(', then '),
    authentication.description,
  ),
];

export default renderAuthenticationHelp;
