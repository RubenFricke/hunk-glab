/** One accepted spelling of a `hunk glab` subcommand. */
interface GlabCliForm {
  /** The arguments after `hunk glab <command>`. */
  readonly args: string;
  /** Left out when the form speaks for itself. */
  readonly description?: string;
}

/** One `hunk glab` subcommand. */
export interface GlabCliSubcommand {
  readonly name: 'mr';
  /** The positional arguments between the name and the shared options. */
  readonly arguments: string;
  /** One line in the `hunk glab --help` overview. */
  readonly summary: string;
  /** The lead sentence of the subcommand's own help. */
  readonly description: string;
  readonly formsHeading: string;
  readonly forms: readonly GlabCliForm[];
  readonly notes?: readonly string[];
}

/** One option every subcommand shares. */
interface GlabCliOption {
  readonly flag: string;
  readonly description: string;
}

/** Everything Hunk and the help screens need to know about `hunk glab`. */
export interface GlabCliReference {
  /** The top-level command the extension claims: `hunk <name>`. */
  readonly name: string;
  /** One line for Hunk's command discovery. */
  readonly summary: string;
  /** What follows `hunk glab` in Hunk's command discovery. */
  readonly usage: string;
  /** The lead sentence of the overview help. */
  readonly description: string;
  readonly options: readonly GlabCliOption[];
  readonly authentication: {
    /** The environment variables, in the order they are read. */
    readonly variables: readonly string[];
    readonly description: string;
  };
  readonly subcommands: readonly GlabCliSubcommand[];
}

/**
 * Describes `hunk glab` once, for its registration and every help screen, so a
 * new subcommand is documented everywhere by adding it here.
 */
const GLAB_CLI_REFERENCE: GlabCliReference = {
  name: 'glab',
  summary: 'Review GitLab merge requests',
  usage: 'mr <merge-request> [--repo <group/project>]',
  description:
    'Review GitLab merge requests in Hunk without requiring the glab CLI.',
  options: [
    {
      flag: '--repo <group/project>',
      description: 'use an explicit project path or id instead of the origin',
    },
    {
      flag: '-- <patch-options...>',
      description: 'pass the remaining options to the `hunk patch` review',
    },
  ],
  authentication: {
    variables: ['GITLAB_TOKEN', 'GITLAB_ACCESS_TOKEN'],
    description: 'optional for public projects; needs read_api',
  },
  subcommands: [
    {
      name: 'mr',
      arguments: '<merge-request>',
      summary: 'Review a GitLab merge request.',
      description:
        'Review a GitLab merge request without requiring the glab CLI.',
      formsHeading: 'Merge request forms',
      forms: [
        { args: '123', description: 'infer the project from the local origin' },
        { args: "'!123'", description: "use GitLab's own reference" },
        {
          args: '123 --repo gitlab-org/cli',
          description: 'use an explicit project',
        },
        {
          args: '123 --repo 34675721',
          description: 'use a numeric project id',
        },
      ],
      notes: [
        'Quote `!123`, because shells expand `!` from their history.',
        'Pass Hunk patch options after `--`.',
      ],
    },
  ],
};

export default GLAB_CLI_REFERENCE;
