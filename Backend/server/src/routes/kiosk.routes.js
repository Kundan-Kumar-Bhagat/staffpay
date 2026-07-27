import { Router } from 'express';
import * as c from '../controllers/kiosk.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { tenant } from '../middleware/tenant.js';
import { kioskAuth } from '../middleware/kiosk.js';

const r = Router();
r.post('/unlock', c.unlock);                                   // public — guarded by the code
r.get('/today', kioskAuth, c.today);
r.get('/lookup', kioskAuth, c.lookup);
r.post('/checkin', kioskAuth, c.checkIn);
r.post('/checkout', kioskAuth, c.checkOut);
r.get('/logs', protect, tenant, authorize('admin', 'manager'), c.logs);
r.post('/rotate', protect, tenant, authorize('admin'), c.rotate);
export default r;
