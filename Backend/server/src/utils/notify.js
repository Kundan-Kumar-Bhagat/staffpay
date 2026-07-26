import Notification from '../models/Notification.js';

export const notify = (userOrId, kind, title, body, link) =>
  Notification.create({ user: userOrId?._id || userOrId, kind, title, body, link }).catch(() => {});
