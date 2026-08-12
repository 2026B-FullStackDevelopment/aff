// Turns a zod schema failure into the project's standard 400 error.
import type { ZodType } from 'zod';

function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);

  if (!result.success) {
    // The error envelope carries one message (docs/api_design.md §2.3), so the
    // first issue is what the client sees.
    const error: Error = new Error(result.error.issues[0].message);
    error.statusCode = 400;
    throw error;
  }

  return result.data;
}

export { parseBody };
