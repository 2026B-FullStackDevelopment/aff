import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  connectMock,
  disconnectMock,
  onMock,
  onceMock,
  modelNamesMock,
  modelMock,
  syncIndexesMock,
} = vi.hoisted(() => ({
  connectMock: vi.fn().mockResolvedValue(undefined),
  disconnectMock: vi.fn().mockResolvedValue(undefined),
  onMock: vi.fn(),
  onceMock: vi.fn(),
  modelNamesMock: vi.fn(() => []),
  modelMock: vi.fn(),
  syncIndexesMock: vi.fn().mockResolvedValue([]),
}));

vi.mock('mongoose', () => ({
  default: {
    connect: connectMock,
    disconnect: disconnectMock,
    connection: { on: onMock },
    modelNames: modelNamesMock,
    model: modelMock,
  },
}));

vi.mock('../../src/config/env.js', () => ({
  env: { mongoUri: 'mongodb://127.0.0.1:27017/aff', nodeEnv: 'production' },
}));

import mongoose from 'mongoose';
import {
  connectDatabase,
  shutdown,
  registerGracefulShutdown,
  syncIndexes,
} from '../../src/config/database.js';

describe('connectDatabase', () => {
  beforeEach(() => {
    connectMock.mockClear();
    onMock.mockClear();
    modelNamesMock.mockReturnValue([]);
    syncIndexesMock.mockClear();
    syncIndexesMock.mockResolvedValue([]);
    modelMock.mockReturnValue({ syncIndexes: syncIndexesMock });
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

describe('syncIndexes', () => {
  beforeEach(() => {
    modelNamesMock.mockReturnValue(['Delivery', 'User']);
    syncIndexesMock.mockClear();
    syncIndexesMock.mockResolvedValue([]);
    modelMock.mockClear();
    modelMock.mockReturnValue({ syncIndexes: syncIndexesMock });
  });

  it('builds the declared indexes for every registered model', async () => {
    await syncIndexes();

    expect(modelMock).toHaveBeenCalledWith('Delivery');
    expect(modelMock).toHaveBeenCalledWith('User');
    expect(syncIndexesMock).toHaveBeenCalledTimes(2);
  });

  it('lets a failed index build reach the caller instead of booting without it', async () => {
    const failure = new Error('CannotCreateIndex');
    syncIndexesMock.mockRejectedValue(failure);

    await expect(syncIndexes()).rejects.toBe(failure);
  });

  it('does nothing when no model has been registered', async () => {
    modelNamesMock.mockReturnValue([]);

    await syncIndexes();

    expect(syncIndexesMock).not.toHaveBeenCalled();
  });
});

describe('connectDatabase index handling', () => {
  beforeEach(() => {
    connectMock.mockClear();
    modelNamesMock.mockReturnValue(['Delivery']);
    syncIndexesMock.mockClear();
    syncIndexesMock.mockResolvedValue([]);
    modelMock.mockReturnValue({ syncIndexes: syncIndexesMock });
  });

  it('never relies on autoIndex, so every environment builds indexes the same way', async () => {
    await connectDatabase();

    expect(connectMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ autoIndex: false }),
    );
  });

  it('builds the indexes after connecting', async () => {
    await connectDatabase();

    expect(syncIndexesMock).toHaveBeenCalled();
  });
});
