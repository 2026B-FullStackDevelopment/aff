// Exposes safe NotificationPreference operations for other modules (F3's future matcher) without importing notification-preference.service directly.
import * as notificationPreferenceService from './notification-preference.service.js';

const notificationPreferenceInterface = {
  listActivePreferencesForMatching: notificationPreferenceService.listActivePreferencesForMatching,
};

export { notificationPreferenceInterface };
