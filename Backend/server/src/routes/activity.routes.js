import { Router } from 'express';
import Activity from '../models/Activity.js';
import { protect, authorize } from '../middleware/auth.js';

import { tenant } from '../middleware/tenant.js';

const r = Router();
r.get('/', protect, tenant, authorize('admin', 'manager'), async (req, res) => {
  const rows = await Activity.find()
    .populate('actor', 'name employeeId role')
    .sort('-createdAt')
    .limit(+req.query.limit || 30);
  res.json(rows);
});
export default r;