import { HunkExtensionUserError } from 'hunkdiff/extension';

import buildCancelledError from './buildCancelledError.ts';

interface ReadBoundedBodyOptions {
  readonly response: Response;
  readonly signal: AbortSignal;
  readonly maxBytes: number;
  readonly tooLargeMessage: string;
  readonly emptyMessage: string;
}

/**
 * Reads a response body up to a byte limit, so a server cannot fill the memory
 * of the process. The limit holds for the declared length and for the bytes
 * that actually arrive.
 *
 * @param options - The response, the run's signal, the limit and the messages.
 * @returns The body.
 * @throws {HunkExtensionUserError} When the body is too large or empty, or the
 *   run is cancelled.
 */
const readBoundedBody = async ({
  response,
  signal,
  maxBytes,
  tooLargeMessage,
  emptyMessage,
}: ReadBoundedBodyOptions): Promise<Uint8Array> => {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new HunkExtensionUserError(tooLargeMessage);
  }
  if (!response.body) {
    throw new HunkExtensionUserError(emptyMessage);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      if (signal.aborted) {
        throw buildCancelledError();
      }
      const next = await reader.read();
      if (next.done) {
        break;
      }
      const chunk: unknown = next.value;
      if (!(chunk instanceof Uint8Array)) {
        throw new TypeError('The response body is not a byte stream.');
      }
      total += chunk.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new HunkExtensionUserError(tooLargeMessage);
      }
      chunks.push(chunk);
    }
  } catch (error) {
    if (signal.aborted) {
      throw buildCancelledError();
    }
    throw error;
  } finally {
    reader.releaseLock();
  }

  if (total === 0) {
    throw new HunkExtensionUserError(emptyMessage);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

export default readBoundedBody;
