import { describe, expect, it } from 'vitest';

import GLAB_CLI_REFERENCE from '../glabCliReference.ts';
import renderAuthenticationHelp from './renderAuthenticationHelp.ts';

describe('renderAuthenticationHelp', () => {
  it('names the token variables in the order they are read', () => {
    expect(renderAuthenticationHelp(GLAB_CLI_REFERENCE)).toEqual([
      'Authentication:',
      '  GITLAB_TOKEN, then GITLAB_ACCESS_TOKEN optional for public projects; needs read_api',
    ]);
  });
});
