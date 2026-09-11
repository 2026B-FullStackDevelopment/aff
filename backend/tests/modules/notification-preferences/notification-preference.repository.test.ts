import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createMock, findMock, sortMock, findOneAndUpdateMock, findOneAndDeleteMock, findOneMock, leanMock } =
  vi.hoisted(() => {
    const leanMock = vi.fn();
    const sortMock = vi.fn(() => ({ lean: leanMock }));
    return {
      createMock: vi.fn(),
      findMock: vi.fn(() => ({ sort: sortMock, lean: leanMock })),
      sortMock,
      findOneAndUpdateMock: vi.fn(() => ({ lean: leanMock })),
      findOneAndDeleteMock: vi.fn(() => ({ lean: leanMock })),
      findOneMock: vi.fn(() => ({ lean: leanMock })),
      leanMock,
    };
  });

vi.mock('../../../src/modules/notification-preferences/notification-preference.model.js', () => ({
  default: {
    create: createMock,
    find: findMock,
    findOneAndUpdate: findOneAndUpdateMock,
    findOneAndDelete: findOneAndDeleteMock,
    findOne: findOneMock,
  },
}));

import {
  createPreference,
  findPreferencesByRecipientId,
  updatePreferenceByIdAndRecipient,
  deletePreferenceByIdAndRecipient,
  findPreferenceByIdAndRecipient,
  findAllActivePreferences,
} from '../../../src/modules/notification-preferences/notification-preference.repository.js';

describe('notification-preference.repository', () => {
  beforeEach(() => {
    createMock.mockClear();
    findMock.mockClear();
    sortMock.mockClear();
    findOneAndUpdateMock.mockClear();
    findOneAndDeleteMock.mockClear();
    findOneMock.mockClear();
    leanMock.mockClear();
    leanMock.mockResolvedValue({ _id: 'pref1' });
  });

  it('createPreference calls NotificationPreference.create with recipientId merged into the data', async () => {
    createMock.mockResolvedValue({ _id: 'pref1' });

    const result = await createPreference('r1', {
      preferenceTitle: 'Any MEAT listing',
      categories: ['MEAT'],
      vegetarian: null,
      priceMin: null,
      priceMax: null,
      city: null,
      isActive: true,
    });

    expect(createMock).toHaveBeenCalledWith({
      recipientId: 'r1',
      preferenceTitle: 'Any MEAT listing',
      categories: ['MEAT'],
      vegetarian: null,
      priceMin: null,
      priceMax: null,
      city: null,
      isActive: true,
    });
    expect(result).toEqual({ _id: 'pref1' });
  });

  it('findPreferencesByRecipientId queries by recipientId, sorts newest-first, and returns lean documents', async () => {
    leanMock.mockResolvedValue([{ _id: 'pref1' }]);

    const result = await findPreferencesByRecipientId('r1');

    expect(findMock).toHaveBeenCalledWith({ recipientId: 'r1' });
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    expect(result).toEqual([{ _id: 'pref1' }]);
  });

  it('updatePreferenceByIdAndRecipient scopes the update to _id and recipientId together', async () => {
    leanMock.mockResolvedValue({ _id: 'pref1', isActive: false });

    const result = await updatePreferenceByIdAndRecipient('pref1', 'r1', { isActive: false });

    expect(findOneAndUpdateMock).toHaveBeenCalledWith(
      { _id: 'pref1', recipientId: 'r1' },
      { $set: { isActive: false } },
      { new: true, runValidators: true },
    );
    expect(result).toEqual({ _id: 'pref1', isActive: false });
  });

  it('updatePreferenceByIdAndRecipient resolves null when the id does not belong to this recipient', async () => {
    leanMock.mockResolvedValue(null);

    expect(await updatePreferenceByIdAndRecipient('pref1', 'someone-else', { isActive: false })).toBeNull();
  });

  it('deletePreferenceByIdAndRecipient scopes the delete to _id and recipientId together', async () => {
    leanMock.mockResolvedValue({ _id: 'pref1' });

    const result = await deletePreferenceByIdAndRecipient('pref1', 'r1');

    expect(findOneAndDeleteMock).toHaveBeenCalledWith({ _id: 'pref1', recipientId: 'r1' });
    expect(result).toEqual({ _id: 'pref1' });
  });

  it('deletePreferenceByIdAndRecipient resolves null when the id does not belong to this recipient', async () => {
    leanMock.mockResolvedValue(null);

    expect(await deletePreferenceByIdAndRecipient('pref1', 'someone-else')).toBeNull();
  });

  it('findPreferenceByIdAndRecipient scopes the read to _id and recipientId together', async () => {
    leanMock.mockResolvedValue({ _id: 'pref1', priceMin: 1, priceMax: 5 });

    const result = await findPreferenceByIdAndRecipient('pref1', 'r1');

    expect(findOneMock).toHaveBeenCalledWith({ _id: 'pref1', recipientId: 'r1' });
    expect(result).toEqual({ _id: 'pref1', priceMin: 1, priceMax: 5 });
  });

  it('findPreferenceByIdAndRecipient resolves null when the id does not belong to this recipient', async () => {
    leanMock.mockResolvedValue(null);

    expect(await findPreferenceByIdAndRecipient('pref1', 'someone-else')).toBeNull();
  });

  it('findAllActivePreferences queries only isActive rows, for the future F3 matcher', async () => {
    leanMock.mockResolvedValue([{ _id: 'pref1', isActive: true }]);

    const result = await findAllActivePreferences();

    expect(findMock).toHaveBeenCalledWith({ isActive: true });
    expect(result).toEqual([{ _id: 'pref1', isActive: true }]);
  });
});
