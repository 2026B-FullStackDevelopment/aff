// Exposes the one function other modules use to send a notification, without importing notification.service directly.
import * as notificationService from './notification.service.js';

const notificationInterface = {
  sendNotification: notificationService.sendNotification,
};

export { notificationInterface };
