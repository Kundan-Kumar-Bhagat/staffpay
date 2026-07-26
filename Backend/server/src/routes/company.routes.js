import { Router } from 'express';
import * as c from '../controllers/company.controller.js';
import { protect, authorize } from '../middleware/auth.js';
const r = Router();
r.get('/', c.get);
r.put('/', protect, authorize('admin'), c.update);
r.get('/integrations', protect, authorize('admin'), c.integrations);
r.post('/integrations/test-whatsapp', protect, authorize('admin'), c.testWhatsApp);
export default r;