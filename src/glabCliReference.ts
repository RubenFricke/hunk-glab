/** One accepted spelling of a `hunk glab` subcommand. */
interface GlabCliForm {
  /** The arguments after `hunk glab <command>`; empty when left out. */
  readonly args: string;
  /** Left out when the form speaks for itself. */
  readonly description?: string;
}

/** One `hunk glab` subcommand. */
export interface GlabCliSubcommand {
  readonly name: 'mr' | 'commit' | 'compare';
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
  usage: 'mr [merge-request] [--repo <group/project>]',
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
      arguments: '[merge-request]',
      summary:
        'Review a GitLab merge request; infer it from the current branch when omitted.',
      description:
        'Review a GitLab merge request without requiring the glab CLI.',
      formsHeading: 'Merge request forms',
      forms: [
        {
          args: '',
          description: 'find the open merge request for the current branch',
        },
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
        {
          args: "'gitlab-org/cli!123'",
          description: 'name the project and merge request',
        },
        { args: 'https://gitlab.com/gitlab-org/cli/-/merge_requests/123' },
      ],
      notes: [
        'Quote `!123`, because shells expand `!` from their history.',
        'Pass Hunk patch options after `--`.',
      ],
    },
    {
      name: 'commit',
      arguments: '<commit>',
      summary: 'Review a GitLab commit without requiring the glab CLI.',
      description: 'Review a GitLab commit without requiring the glab CLI.',
      formsHeading: 'Commit forms',
      forms: [
        {
          args: 'abcdef1',
          description: 'infer the project from the local origin',
        },
        {
          args: 'abcdef1 --repo gitlab-org/cli',
          description: 'use an explicit project',
        },
      ],
    },
    {
      name: 'compare',
      arguments: '<base>...<head>',
      summary: 'Review the changes between two GitLab refs.',
      description:
        'Review the changes between two GitLab branches, tags, or commits.',
      formsHeading: 'Compare forms',
      forms: [
        {
          args: 'main...feature',
          description: 'infer the project from the local origin',
        },
        { args: 'v1.126.0...v1.127.0 --repo gitlab-org/cli' },
      ],
      notes: ['Use three dots exactly. Pass Hunk patch options after `--`.'],
    },
  ],
};

export default GLAB_CLI_REFERENCE;
