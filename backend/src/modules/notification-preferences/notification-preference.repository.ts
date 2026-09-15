// Contains NotificationPreference database queries so services do not call Mongoose directly.
import NotificationPreference from './notification-preference.model.js';
import type { NotificationPreferenceDocument } from './notification-preference.types.js';
import type { Types } from 'mongoose';
import type { NotificationPreferenceWriteInput } from './notification-preference.types.js';

function createPreference(recipientId: string | Types.ObjectId, data: NotificationPreferenceWriteInput) {
  return NotificationPreference.create({ recipientId, ...data });
}

function findPreferencesByRecipientId(recipientId: string | Types.ObjectId) {
  return NotificationPreference.find({ recipientId })
    .sort({ createdAt: -1 })
    .lean<NotificationPreferenceDocument[]>();
}

function updatePreferenceByIdAndRecipient(
  preferenceId: string | Types.ObjectId,
  recipientId: string | Types.ObjectId,
  patch: Partial<NotificationPreferenceWriteInput>
) {
  return NotificationPreference.findOneAndUpdate(
    { _id: preferenceId, recipientId },
    { $set: patch },
    { new: true, runValidators: true }
  ).lean<NotificationPreferenceDocument>();
}

function deletePreferenceByIdAndRecipient(preferenceId: string | Types.ObjectId, recipientId: string | Types.ObjectId) {
  return NotificationPreference.findOneAndDelete({ _id: preferenceId, recipientId }).lean<NotificationPreferenceDocument>();
}

function findPreferenceByIdAndRecipient(preferenceId: string | Types.ObjectId, recipientId: string | Types.ObjectId) {
  return NotificationPreference.findOne({ _id: preferenceId, recipientId }).lean<NotificationPreferenceDocument>();
}

// For F3's future in-process matching scan — not called by anything in this plan.
function findAllActivePreferences() {
  return NotificationPreference.find({ isActive: true }).lean<NotificationPreferenceDocument[]>();
}

export {
  createPreference,
  findPreferencesByRecipientId,
  updatePreferenceByIdAndRecipient,
  deletePreferenceByIdAndRecipient,
  findPreferenceByIdAndRecipient,
  findAllActivePreferences,
};
export type { NotificationPreferenceWriteInput } from './notification-preference.types.js';
