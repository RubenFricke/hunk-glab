import { describe, expect, it } from 'vitest';

import readBoundedBody from './readBoundedBody.ts';

const MESSAGES = {
  tooLargeMessage: 'Too large.',
  emptyMessage: 'Empty.',
} as const;

const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

interface StreamedBody {
  readonly stream: ReadableStream<Uint8Array>;
  readonly isCancelled: () => boolean;
}

/** A body that sends the chunks one by one and records a cancel. */
const streamChunks = (chunks: readonly Uint8Array[]): StreamedBody => {
  let index = 0;
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    pull: (controller) => {
      const chunk = chunks[index];
      index += 1;
      if (chunk === undefined) {
        controller.close();
        return;
      }
      controller.enqueue(chunk);
    },
    cancel: () => {
      cancelled = true;
    },
  });
  return { stream, isCancelled: () => cancelled };
};

const read = (
  response: Response,
  maxBytes = 8,
  signal = new AbortController().signal,
): Promise<Uint8Array> =>
  readBoundedBody({ response, signal, maxBytes, ...MESSAGES });

describe('readBoundedBody', () => {
  it('joins the streamed chunks', async () => {
    const { stream } = streamChunks([encode('abc'), encode('def')]);

    expect(new TextDecoder().decode(await read(new Response(stream)))).toBe(
      'abcdef',
    );
  });

  it('accepts a body of exactly the limit', async () => {
    expect(await read(new Response('12345678'))).toHaveLength(8);
  });

  it('rejects a declared length over the limit without reading', async () => {
    const { stream, isCancelled } = streamChunks([encode('a')]);
    const response = new Response(stream, {
      headers: { 'content-length': '9' },
    });

    await expect(read(response)).rejects.toMatchObject({
      message: 'Too large.',
    });
    expect(isCancelled()).toBe(false);
  });

  it('stops reading once the streamed bytes pass the limit', async () => {
    const { stream, isCancelled } = streamChunks([
      encode('12345'),
      encode('6789'),
      encode('never read'),
    ]);

    await expect(read(new Response(stream))).rejects.toMatchObject({
      message: 'Too large.',
    });
    expect(isCancelled()).toBe(true);
  });

  it.each([
    ['no body', new Response(null)],
    ['an empty body', new Response('')],
  ])('rejects %s', async (_name, response) => {
    await expect(read(response)).rejects.toMatchObject({ message: 'Empty.' });
  });

  it('stops when the run is cancelled', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      read(new Response('abc'), 8, controller.signal),
    ).rejects.toMatchObject({ message: 'GitLab diff loading was cancelled.' });
  });

  it('reports a stream that breaks after a cancel as cancelled', async () => {
    const controller = new AbortController();
    const stream = new ReadableStream<Uint8Array>({
      pull: () => {
        controller.abort();
        throw new Error('socket closed');
      },
    });

    await expect(
      read(new Response(stream), 8, controller.signal),
    ).rejects.toMatchObject({ message: 'GitLab diff loading was cancelled.' });
  });

  it('passes on a stream that breaks by itself', async () => {
    const stream = new ReadableStream<Uint8Array>({
      pull: () => {
        throw new Error('socket closed');
      },
    });

    await expect(read(new Response(stream))).rejects.toThrow('socket closed');
  });

  it('rejects a body that is not a byte stream', async () => {
    const response = {
      headers: new Headers(),
      body: new ReadableStream({
        pull: (controller) => {
          controller.enqueue('text');
        },
      }),
    } as unknown as Response;

    await expect(read(response)).rejects.toThrow(
      'The response body is not a byte stream.',
    );
  });
});
