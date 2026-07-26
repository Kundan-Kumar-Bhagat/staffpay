import { Router } from 'express';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';

const r = Router();
r.use(protect);

r.get('/', async (req, res) => {
  const rows = await Notification.find({ user: req.user._id })
    .sort({ read: 1, createdAt: -1 })
    .limit(+req.query.limit || 15);
  res.json(rows);
});

r.get('/unread-count', async (req, res) =>
  res.json({ count: await Notification.countDocuments({ user: req.user._id, read: false }) }));

r.put('/read-all', async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ message: 'All caught up' });
});

r.put('/:id/read', async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { read: true });
  res.json({ ok: true });
});

export default r;
