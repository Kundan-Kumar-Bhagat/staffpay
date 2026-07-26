import { Router } from 'express';
import * as c from '../controllers/workspace.controller.js';
import { protect, superOnly, authorize } from '../middleware/auth.js';
import { tenant } from '../middleware/tenant.js';

const r = Router();
r.post('/', protect, superOnly, c.provision);
r.get('/', protect, superOnly, c.list);
r.put('/:id', protect, superOnly, c.update);
r.post('/:id/switch', protect, c.switchTo);
r.post('/join-code/rotate', protect, tenant, authorize('admin'), c.rotateCode);
export default r;
