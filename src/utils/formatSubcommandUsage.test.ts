import { describe, expect, it } from 'vitest';

import GLAB_CLI_REFERENCE from '../glabCliReference.ts';
import formatSubcommandUsage from './formatSubcommandUsage.ts';

describe('formatSubcommandUsage', () => {
  it('lists the arguments and the shared options of a subcommand', () => {
    const [mr] = GLAB_CLI_REFERENCE.subcommands;
    if (mr === undefined) {
      throw new Error('Expected the mr subcommand.');
    }

    expect(formatSubcommandUsage(mr, GLAB_CLI_REFERENCE)).toBe(
      'mr <merge-request> [--repo <group/project>] [-- <patch-options...>]',
    );
  });
});
