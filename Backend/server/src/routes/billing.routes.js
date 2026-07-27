import { Router } from 'express';
import * as c from '../controllers/billing.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { tenant } from '../middleware/tenant.js';

const r = Router();
r.use(protect, tenant, authorize('admin'));
r.get('/usage', c.usage);
r.post('/checkout', c.checkout);
r.post('/portal', c.portal);
r.put('/seats', c.seats);
export default r;
