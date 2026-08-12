import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { parseBody } from '../../../src/shared/validation/parse-body.js';

const schema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }),
  age: z.number({ message: 'Age must be a number.' }),
});

describe('shared/validation/parse-body', () => {
  it('returns the parsed value when the body is valid', () => {
    expect(parseBody(schema, { name: 'alice', age: 30 })).toEqual({ name: 'alice', age: 30 });
  });

  it('strips keys the schema does not declare', () => {
    expect(parseBody(schema, { name: 'alice', age: 30, role: 'ADMIN' })).toEqual({
      name: 'alice',
      age: 30,
    });
  });

  it('throws the first issue message when the body is invalid', () => {
    expect(() => parseBody(schema, { name: '', age: 30 })).toThrow('Name is required.');
  });

  it('sets statusCode 400 on the thrown error', () => {
    let caught;

    try {
      parseBody(schema, { name: '', age: 30 });
    } catch (error) {
      caught = error;
    }

    expect(caught.statusCode).toBe(400);
  });

  it('throws a 400 when the body is missing entirely', () => {
    let caught;

    try {
      parseBody(schema, undefined);
    } catch (error) {
      caught = error;
    }

    expect(caught.statusCode).toBe(400);
  });
});
