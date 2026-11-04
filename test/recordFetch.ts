interface RecordedRequest {
  readonly url: string;
  readonly init: RequestInit;
}

interface RecordedFetch {
  readonly requests: RecordedRequest[];
  readonly fetch: (url: string, init: RequestInit) => Promise<Response>;
}

/** A fake fetch that records each request and answers with `respond`. */
const recordFetch = (
  respond: (url: string) => Response | Promise<Response>,
): RecordedFetch => {
  const requests: RecordedRequest[] = [];
  return {
    requests,
    fetch: async (url, init) => {
      requests.push({ url, init });
      return respond(url);
    },
  };
};

export default recordFetch;
