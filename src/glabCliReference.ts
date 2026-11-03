/** Everything Hunk and the help screens need to know about `hunk glab`. */
export interface GlabCliReference {
  /** The top-level command the extension claims: `hunk <name>`. */
  readonly name: string;
  /** One line for Hunk's command discovery. */
  readonly summary: string;
  /** What follows `hunk glab` in the usage line. */
  readonly usage: string;
  /** The lead sentence of the help screen. */
  readonly description: string;
}

/**
 * Describes `hunk glab` once, for its registration and every help screen, so a
 * new subcommand is documented everywhere by adding it here.
 */
const GLAB_CLI_REFERENCE: GlabCliReference = {
  name: 'glab',
  summary: 'Review GitLab merge requests',
  usage: '<command>',
  description:
    'Review GitLab merge requests in Hunk without requiring the glab CLI.',
};

export default GLAB_CLI_REFERENCE;
