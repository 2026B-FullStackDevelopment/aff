import { describe, it, expect, vi } from 'vitest';
import type { Response } from 'express';
import { ok, created, paginated, notImplemented } from '../../../src/shared/http/response.js';

function createMockResponse(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('ok', () => {
  it('sends status 200 and wraps data by default', () => {
    const res = createMockResponse();

    ok(res, { id: '1' });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: { id: '1' } });
  });

  it('honors a custom status code', () => {
    const res = createMockResponse();

    ok(res, null, 204);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.json).toHaveBeenCalledWith({ data: null });
  });
});

describe('created', () => {
  it('sends status 201 and wraps data', () => {
    const res = createMockResponse();

    created(res, { id: '1' });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: { id: '1' } });
  });
});

describe('paginated', () => {
  it('sends status 200 and wraps items with page metadata', () => {
    const res = createMockResponse();

    paginated(res, [{ id: '1' }, { id: '2' }], 1, 20, 2);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: { items: [{ id: '1' }, { id: '2' }], page: 1, limit: 20, total: 2 },
    });
  });

  it('handles an empty page', () => {
    const res = createMockResponse();

    paginated(res, [], 1, 20, 0);

    expect(res.json).toHaveBeenCalledWith({
      data: { items: [], page: 1, limit: 20, total: 0 },
    });
  });
});

describe('notImplemented', () => {
  it('sends status 501 with a message', () => {
    const res = createMockResponse();

    notImplemented(res);

    expect(res.status).toHaveBeenCalledWith(501);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not implemented yet.' });
  });
});
