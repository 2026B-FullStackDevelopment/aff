import { describe, it, expect, vi, beforeEach } from 'vitest';

const { connectMock, disconnectMock, onMock, onceMock } = vi.hoisted(() => ({
  connectMock: vi.fn().mockResolvedValue(undefined),
  disconnectMock: vi.fn().mockResolvedValue(undefined),
  onMock: vi.fn(),
  onceMock: vi.fn(),
}));

vi.mock('mongoose', () => ({
  default: {
    connect: connectMock,
    disconnect: disconnectMock,
    connection: { on: onMock },
  },
}));

vi.mock('../../src/config/env.js', () => ({
  env: { mongoUri: 'mongodb://127.0.0.1:27017/aff', nodeEnv: 'production' },
}));

import mongoose from 'mongoose';
import { connectDatabase, shutdown, registerGracefulShutdown } from '../../src/config/database.js';

describe('connectDatabase', () => {
  beforeEach(() => {
    connectMock.mockClear();
    onMock.mockClear();
  });

  it('connects using the configured URI with autoIndex disabled outside development', async () => {
    await connectDatabase();

    expect(connectMock).toHaveBeenCalledWith(
      'mongodb://127.0.0.1:27017/aff',
      expect.objectContaining({ autoIndex: false })
    );
  });

  it('registers listeners for connection error and disconnected events', async () => {
    await connectDatabase();

    expect(onMock).toHaveBeenCalledWith('error', expect.any(Function));
    expect(onMock).toHaveBeenCalledWith('disconnected', expect.any(Function));
  });
});

describe('shutdown', () => {
  beforeEach(() => {
    disconnectMock.mockClear();
  });

  it('disconnects mongoose and exits the process', async () => {
    const exit = vi.fn();

    await shutdown('SIGINT', exit);

    expect(disconnectMock).toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(0);
  });
});

describe('registerGracefulShutdown', () => {
  it('registers handlers for SIGINT and SIGTERM', () => {
    const processOnceSpy = vi.spyOn(process, 'once').mockImplementation(onceMock);

    registerGracefulShutdown();

    expect(onceMock).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    expect(onceMock).toHaveBeenCalledWith('SIGTERM', expect.any(Function));

    processOnceSpy.mockRestore();
  });
});
