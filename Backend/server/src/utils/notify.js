import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendWhatsApp } from '../services/whatsapp.service.js';

export const notify = async (userOrId, kind, title, body, link) => {
  Notification.create({ user: userOrId?._id || userOrId, kind, title, body, link }).catch(() => {});
  if (process.env.WA_NOTIFY === 'true') {
    try {
      const u = userOrId?.phone ? userOrId : await User.findById(userOrId?._id || userOrId);
      if (u?.phone) await sendWhatsApp(u.phone, `${title} — ${body}`);
    } catch (e) { console.error('WA notify failed:', e.message); }
  }
};
