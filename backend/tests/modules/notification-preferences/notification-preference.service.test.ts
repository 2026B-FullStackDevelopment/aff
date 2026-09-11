import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  createPreferenceMock,
  findPreferencesByRecipientIdMock,
  updatePreferenceByIdAndRecipientMock,
  deletePreferenceByIdAndRecipientMock,
  findAllActivePreferencesMock,
  isPremiumRecipientMock,
} = vi.hoisted(() => ({
  createPreferenceMock: vi.fn(),
  findPreferencesByRecipientIdMock: vi.fn(),
  updatePreferenceByIdAndRecipientMock: vi.fn(),
  deletePreferenceByIdAndRecipientMock: vi.fn(),
  findAllActivePreferencesMock: vi.fn(),
  isPremiumRecipientMock: vi.fn(),
}));

vi.mock('../../../src/modules/notification-preferences/notification-preference.repository.js', () => ({
  createPreference: createPreferenceMock,
  findPreferencesByRecipientId: findPreferencesByRecipientIdMock,
  updatePreferenceByIdAndRecipient: updatePreferenceByIdAndRecipientMock,
  deletePreferenceByIdAndRecipient: deletePreferenceByIdAndRecipientMock,
  findAllActivePreferences: findAllActivePreferencesMock,
}));

vi.mock('../../../src/modules/subscriptions/subscription.interface.js', () => ({
  subscriptionInterface: {
    isPremiumRecipient: isPremiumRecipientMock,
  },
}));

import {
  listPreferences,
  createPreference,
  updatePreference,
  deletePreference,
  listActivePreferencesForMatching,
} from '../../../src/modules/notification-preferences/notification-preference.service.js';

const VALID_ID = '507f1f77bcf86cd799439011';

describe('notification-preference.service', () => {
  beforeEach(() => {
    createPreferenceMock.mockClear();
    findPreferencesByRecipientIdMock.mockClear();
    updatePreferenceByIdAndRecipientMock.mockClear();
    deletePreferenceByIdAndRecipientMock.mockClear();
    findAllActivePreferencesMock.mockClear();
    isPremiumRecipientMock.mockClear();
  });

  describe('listPreferences', () => {
    it('does not check tier — a downgraded Recipient can still read their rows', async () => {
      findPreferencesByRecipientIdMock.mockResolvedValue([{ _id: 'pref1' }]);

      const result = await listPreferences('r1');

      expect(isPremiumRecipientMock).not.toHaveBeenCalled();
      expect(findPreferencesByRecipientIdMock).toHaveBeenCalledWith('r1');
      expect(result).toEqual([{ _id: 'pref1' }]);
    });
  });

  describe('createPreference', () => {
    it('rejects a non-Premium Recipient with 403, without writing anything', async () => {
      isPremiumRecipientMock.mockResolvedValue(false);

      await expect(
        createPreference('r1', { preferenceTitle: 'Any MEAT listing', categories: ['MEAT'] } as never),
      ).rejects.toMatchObject({ statusCode: 403 });

      expect(createPreferenceMock).not.toHaveBeenCalled();
    });

    it('fills unset optional fields with null and isActive with true, for a Premium Recipient', async () => {
      isPremiumRecipientMock.mockResolvedValue(true);
      createPreferenceMock.mockResolvedValue({ _id: 'pref1' });

      await createPreference('r1', {
        preferenceTitle: 'Any MEAT listing',
        categories: ['MEAT'],
      } as never);

      expect(createPreferenceMock).toHaveBeenCalledWith('r1', {
        preferenceTitle: 'Any MEAT listing',
        categories: ['MEAT'],
        vegetarian: null,
        priceMin: null,
        priceMax: null,
        city: null,
        isActive: true,
      });
    });

    it('respects an explicit isActive: false instead of defaulting to true', async () => {
      isPremiumRecipientMock.mockResolvedValue(true);
      createPreferenceMock.mockResolvedValue({ _id: 'pref1' });

      await createPreference('r1', {
        preferenceTitle: 'Any MEAT listing',
        categories: ['MEAT'],
        isActive: false,
      } as never);

      expect(createPreferenceMock).toHaveBeenCalledWith('r1', expect.objectContaining({ isActive: false }));
    });
  });

  describe('updatePreference', () => {
    it('rejects a malformed id with 404 before checking tier', async () => {
      await expect(updatePreference('r1', 'not-an-object-id', { isActive: false })).rejects.toMatchObject({
        statusCode: 404,
      });

      expect(isPremiumRecipientMock).not.toHaveBeenCalled();
      expect(updatePreferenceByIdAndRecipientMock).not.toHaveBeenCalled();
    });

    it('rejects a non-Premium Recipient with 403', async () => {
      isPremiumRecipientMock.mockResolvedValue(false);

      await expect(updatePreference('r1', VALID_ID, { isActive: false })).rejects.toMatchObject({
        statusCode: 403,
      });

      expect(updatePreferenceByIdAndRecipientMock).not.toHaveBeenCalled();
    });

    it('rejects with 404 when the id does not belong to this recipient', async () => {
      isPremiumRecipientMock.mockResolvedValue(true);
      updatePreferenceByIdAndRecipientMock.mockResolvedValue(null);

      await expect(updatePreference('r1', VALID_ID, { isActive: false })).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('returns the updated preference for a Premium Recipient updating their own row', async () => {
      isPremiumRecipientMock.mockResolvedValue(true);
      updatePreferenceByIdAndRecipientMock.mockResolvedValue({ _id: VALID_ID, isActive: false });

      const result = await updatePreference('r1', VALID_ID, { isActive: false });

      expect(updatePreferenceByIdAndRecipientMock).toHaveBeenCalledWith(VALID_ID, 'r1', { isActive: false });
      expect(result).toEqual({ _id: VALID_ID, isActive: false });
    });
  });

  describe('deletePreference', () => {
    it('rejects a malformed id with 404 before checking tier', async () => {
      await expect(deletePreference('r1', 'not-an-object-id')).rejects.toMatchObject({ statusCode: 404 });

      expect(isPremiumRecipientMock).not.toHaveBeenCalled();
    });

    it('rejects a non-Premium Recipient with 403', async () => {
      isPremiumRecipientMock.mockResolvedValue(false);

      await expect(deletePreference('r1', VALID_ID)).rejects.toMatchObject({ statusCode: 403 });
      expect(deletePreferenceByIdAndRecipientMock).not.toHaveBeenCalled();
    });

    it('rejects with 404 when the id does not belong to this recipient', async () => {
      isPremiumRecipientMock.mockResolvedValue(true);
      deletePreferenceByIdAndRecipientMock.mockResolvedValue(null);

      await expect(deletePreference('r1', VALID_ID)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('deletes for a Premium Recipient deleting their own row', async () => {
      isPremiumRecipientMock.mockResolvedValue(true);
      deletePreferenceByIdAndRecipientMock.mockResolvedValue({ _id: VALID_ID });

      await deletePreference('r1', VALID_ID);

      expect(deletePreferenceByIdAndRecipientMock).toHaveBeenCalledWith(VALID_ID, 'r1');
    });
  });

  describe('listActivePreferencesForMatching', () => {
    it('delegates to the repository, for the future F3 matcher', async () => {
      findAllActivePreferencesMock.mockResolvedValue([{ _id: 'pref1', isActive: true }]);

      const result = await listActivePreferencesForMatching();

      expect(result).toEqual([{ _id: 'pref1', isActive: true }]);
    });
  });
});
