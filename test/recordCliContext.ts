import type {
  ExtensionCliCommandContext,
  ExtensionCliWriter,
} from 'hunkdiff/extension';

interface RecordCliContextOptions {
  readonly signal?: AbortSignal;
  /** Runs on every chunk written to stderr, before it is recorded. */
  readonly onStderr?: (chunk: string) => void;
}

interface RecordedCliContext {
  readonly stdout: string[];
  readonly stderr: string[];
  readonly ctx: ExtensionCliCommandContext;
}

/** A fake CLI command context that records what a command wrote. */
const recordCliContext = ({
  signal = new AbortController().signal,
  onStderr,
}: RecordCliContextOptions = {}): RecordedCliContext => {
  const decoder = new TextDecoder();
  const recordInto = (
    chunks: string[],
    onChunk?: (chunk: string) => void,
  ): ExtensionCliWriter => ({
    write: (chunk) => {
      const text = typeof chunk === 'string' ? chunk : decoder.decode(chunk);
      onChunk?.(text);
      chunks.push(text);
      return Promise.resolve();
    },
  });
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    ctx: {
      cwd: '/work',
      signal,
      stdin: (async function* () {
        /** No command of hunk-glab reads standard input. */
      })(),
      stdout: recordInto(stdout),
      stderr: recordInto(stderr, onStderr),
    },
  };
};

export default recordCliContext;
