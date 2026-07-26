import { Router } from 'express';
import * as c from '../controllers/company.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { tenant } from '../middleware/tenant.js';

const r = Router();
r.use(protect, tenant);
r.get('/', c.get);
r.put('/', authorize('admin'), c.update);
r.get('/integrations', authorize('admin'), c.integrations);
r.post('/integrations/test-whatsapp', authorize('admin'), c.testWhatsApp);
export default r;