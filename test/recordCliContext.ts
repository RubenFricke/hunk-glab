import type {
  ExtensionCliCommandContext,
  ExtensionCliWriter,
} from 'hunkdiff/extension';

interface RecordedCliContext {
  readonly stdout: string[];
  readonly stderr: string[];
  readonly ctx: ExtensionCliCommandContext;
}

/** A fake CLI command context that records what a command wrote. */
const recordCliContext = (cwd = '/work'): RecordedCliContext => {
  const decoder = new TextDecoder();
  const recordInto = (chunks: string[]): ExtensionCliWriter => ({
    write: (chunk) => {
      chunks.push(typeof chunk === 'string' ? chunk : decoder.decode(chunk));
      return Promise.resolve();
    },
  });
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    ctx: {
      cwd,
      signal: new AbortController().signal,
      stdin: (async function* () {
        /** No command of hunk-glab reads standard input. */
      })(),
      stdout: recordInto(stdout),
      stderr: recordInto(stderr),
    },
  };
};

export default recordCliContext;
