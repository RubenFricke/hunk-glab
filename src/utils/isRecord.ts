/**
 * Checks parsed JSON for an object whose fields can be read one by one.
 *
 * @param value - Parsed JSON.
 * @returns True for an object that is not null or a list.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export default isRecord;
