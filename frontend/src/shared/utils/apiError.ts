/**
 * Extracts a human-readable error message from an unknown API response body.
 *
 * The AFF backend always serialises errors as `{ message: string }`.
 * This helper narrows the `unknown` response data to that shape and returns
 * the server message when present, or `fallback` when the body is missing,
 * malformed, or not an object.
 *
 * @param data     - The raw response data (typed `unknown`).
 * @param fallback - The string to return when no `message` field is found.
 */
export function getResponseMessage(
    data: unknown,
    fallback: string,
): string {
    if (
        typeof data === 'object'
        && data !== null
        && 'message' in data
        && typeof (data as Record<string, unknown>).message === 'string'
    ) {
        return (data as Record<string, unknown>).message as string;
    }

    return fallback;
}
